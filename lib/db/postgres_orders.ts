import { query, transaction } from './postgres';
import { logger } from '../logger';
import { emitEvent } from '../socket';
import { invoiceQueue } from '../worker/queues';

export interface PgOrder {
  id: number;
  tenant_id: string;
  token_number: number;
  table_number: number | null;
  status: 'PENDING' | 'PAID' | 'UNPAID' | 'CANCELLED';
  subtotal: string;
  tax: string;
  total: string;
  created_at: string;
  updated_at: string;
  items?: PgOrderItem[];
}

export interface PgOrderItem {
  id: string;
  order_id: number;
  menu_item_id: number | null;
  name: string;
  price: string;
  quantity: number;
  printed_quantity: number;
}

/**
 * Generate the next token number for a tenant for the current day.
 */
async function getNextTokenNumber(client: any, tenantId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const sql = `
    SELECT COUNT(*) as count 
    FROM orders 
    WHERE tenant_id = $1 AND created_at >= $2
  `;
  const res = await client.query(sql, [tenantId, startOfDay]);
  return parseInt(res.rows[0].count) + 1;
}

/**
 * Atomic Order Creation:
 * 1. Calculates server-side totals (Prevents price spoofing).
 * 2. Generates daily token number.
 * 3. Injects order and line items in a single transaction.
 * 4. Emits real-time state update.
 */
export async function createPgOrder(data: {
  tenantId: string;
  tableNumber: number | null;
  items: { menuItemId: number; quantity: number }[];
  customerName?: string;
  customerPhone?: string;
}): Promise<PgOrder> {
  return await transaction(data.tenantId, async (client) => {
    // 1. Fetch item prices and calculate total
    let subtotal = 0;
    const processedItems = [];
    
    for (const item of data.items) {
      const itemRes = await client.query(
        'SELECT name, price FROM menu_items WHERE id = $1 AND tenant_id = $2',
        [item.menuItemId, data.tenantId]
      );
      
      if (itemRes.rows.length === 0) throw new Error(`Menu item ${item.menuItemId} not found`);
      
      const mi = itemRes.rows[0];
      const price = parseFloat(mi.price);
      subtotal += price * item.quantity;
      
      processedItems.push({
        menuItemId: item.menuItemId,
        name: mi.name,
        price: mi.price,
        quantity: item.quantity
      });
    }

    const total = subtotal; // Tax calculation can be added here based on tenant config
    const tokenNumber = await getNextTokenNumber(client, data.tenantId);

    // 2. Insert Order
    const orderSql = `
      INSERT INTO orders (tenant_id, token_number, table_number, status, subtotal, total, customer_name, customer_phone)
      VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7)
      RETURNING *
    `;
    const orderRes = await client.query(orderSql, [
      data.tenantId,
      tokenNumber,
      data.tableNumber,
      subtotal,
      total,
      data.customerName || null,
      data.customerPhone || null
    ]);
    const order = orderRes.rows[0] as PgOrder;

    // 3. Insert Order Items
    for (const pi of processedItems) {
      const itemSql = `
        INSERT INTO order_items (tenant_id, order_id, menu_item_id, name, price, quantity)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await client.query(itemSql, [
        data.tenantId,
        order.id,
        pi.menuItemId,
        pi.name,
        pi.price,
        pi.quantity
      ]);
    }

    // 4. Emit Real-time Update
    emitEvent('ORDER_UPDATED', { 
      orderId: order.id, 
      type: 'CREATED', 
      tableNumber: order.table_number,
      tenantId: data.tenantId 
    });

    return { ...order, items: processedItems as any };
  });
}

/**
 * List orders for a tenant with pagination.
 */
export async function listPgOrders(tenantId: string, limit = 50, offset = 0): Promise<PgOrder[]> {
  const sql = `
    SELECT * FROM orders 
    WHERE tenant_id = $1 
    ORDER BY created_at DESC 
    LIMIT $2 OFFSET $3
  `;
  return await query<PgOrder>(tenantId, sql, [tenantId, limit, offset]);
}

/**
 * Update order status (Paid/Unpaid/Cancelled).
 */
export async function updatePgOrderStatus(
  tenantId: string,
  orderId: number,
  status: PgOrder['status'],
  paymentMethod?: string
): Promise<PgOrder | null> {
  const sql = `
    UPDATE orders 
    SET status = $1, payment_method = $2, updated_at = NOW() 
    WHERE id = $3 AND tenant_id = $4
    RETURNING *
  `;
  const rows = await query<PgOrder>(tenantId, sql, [status, paymentMethod || null, orderId, tenantId]);
  
  if (rows[0]) {
    emitEvent('ORDER_UPDATED', { 
      orderId: rows[0].id, 
      type: 'STATUS_UPDATED', 
      status, 
      tableNumber: rows[0].table_number 
    });

    // 🚀 Trigger asynchronous background invoice generation if paid
    if (status === 'PAID') {
      invoiceQueue.add('generate-paid-invoice', { 
        orderId, 
        tenantId 
      }).catch(err => logger.error(`Failed to queue invoice for order ${orderId}`, err));
    }
  }
  
  return rows[0] || null;
}

/**
 * Append items to an existing PENDING order.
 */
export async function addItemsToPgOrder(
  tenantId: string,
  orderId: number,
  items: { menuItemId: number; quantity: number }[]
): Promise<PgOrder> {
  return await transaction(tenantId, async (client) => {
    // 1. Fetch order
    const orderRes = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND tenant_id = $2 FOR UPDATE',
      [orderId, tenantId]
    );
    if (orderRes.rows.length === 0) throw new Error('Order not found');
    const order = orderRes.rows[0] as PgOrder;
    if (order.status !== 'PENDING') throw new Error('Can only add to PENDING orders');

    let addedSubtotal = 0;
    
    // 2. Process and insert new items
    for (const item of items) {
      const itemRes = await client.query(
        'SELECT name, price FROM menu_items WHERE id = $1 AND tenant_id = $2',
        [item.menuItemId, tenantId]
      );
      if (itemRes.rows.length === 0) throw new Error(`Item ${item.menuItemId} not found`);
      
      const mi = itemRes.rows[0];
      const price = parseFloat(mi.price);
      addedSubtotal += price * item.quantity;

      // In the relational model, we could either update quantity if item exists 
      // or just add a new line item. We'll add a new line item for the audit trail.
      await client.query(
        `INSERT INTO order_items (tenant_id, order_id, menu_item_id, name, price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tenantId, orderId, item.menuItemId, mi.name, mi.price, item.quantity]
      );
    }

    // 3. Update Order Total
    const newSubtotal = parseFloat(order.subtotal) + addedSubtotal;
    const newTotal = newSubtotal; // + tax
    
    const updateRes = await client.query(
      'UPDATE orders SET subtotal = $1, total = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [newSubtotal, newTotal, orderId]
    );

    const updatedOrder = updateRes.rows[0] as PgOrder;

    // 4. Emit update
    emitEvent('ORDER_UPDATED', { 
      orderId, 
      type: 'ITEMS_ADDED', 
      tableNumber: updatedOrder.table_number 
    });

    return updatedOrder;
  });
}

/**
 * High-performance relational analytics for the restaurant dashboard.
 * Calculates revenue, order counts, and top-selling items using PostgreSQL aggregations.
 */
export async function getPgDashboardStats(tenantId: string) {
  return await transaction(tenantId, async (client) => {
    // 1. Revenue & Order Counts
    const statsSql = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_orders,
        COUNT(*) FILTER (WHERE status = 'PAID') as paid_orders
      FROM orders
      WHERE tenant_id = $1
    `;
    const statsRes = await client.query(statsSql, [tenantId]);
    const stats = statsRes.rows[0];

    // 2. Top Selling Items
    const topItemsSql = `
      SELECT 
        name,
        SUM(quantity) as qty,
        COALESCE(SUM(price::numeric * quantity), 0) as revenue
      FROM order_items
      WHERE tenant_id = $1
      GROUP BY name
      ORDER BY qty DESC
      LIMIT 5
    `;
    const topItemsRes = await client.query(topItemsSql, [tenantId]);

    // 3. Table Occupancy
    const tablesSql = `
      SELECT 
        COUNT(*) as total_tables,
        COUNT(*) FILTER (WHERE status = 'occupied') as occupied_tables
      FROM tables
      WHERE tenant_id = $1
    `;
    const tablesRes = await client.query(tablesSql, [tenantId]);
    const tables = tablesRes.rows[0] || { total_tables: 0, occupied_tables: 0 };

    return {
      revenue: parseFloat(stats.total_revenue),
      orders: parseInt(stats.total_orders),
      pendingOrders: parseInt(stats.pending_orders),
      paidOrders: parseInt(stats.paid_orders),
      topItems: topItemsRes.rows.map(i => ({
        name: i.name,
        qty: parseInt(i.qty),
        revenue: parseFloat(i.revenue)
      })),
      tables: {
        total: parseInt(tables.total_tables),
        occupied: parseInt(tables.occupied_tables)
      }
    };
  });
}
