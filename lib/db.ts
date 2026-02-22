import mysql from 'mysql2/promise'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

// ── Types ──────────────────────────────────────────
export interface MenuItem {
  id: number
  name: string
  price: number
  category: string
  categoryId: number
}

export interface Category {
  id: number
  name: string
  itemCount?: number
}

export interface OrderItem {
  menuItemId: number
  name: string
  quantity: number
  price: number
}

export interface Order {
  id: number
  tokenNumber: number
  tableNumber: number
  status: 'PENDING' | 'PAID' | 'CANCELLED'
  paymentMethod?: 'CASH' | 'ONLINE'
  total: number
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  restaurantName: string
  restaurantAddress: string
  restaurantPhone: string
  restaurantTagline: string
  currencySymbol: string
  currencyCode: string
  currencyLocale: string
  taxEnabled: boolean
  taxRate: number
  taxLabel: string
  tableCount: number
}

// ── Database Connection Pool ──────────────────────────
const globalForMySQL = globalThis as unknown as {
  mysqlPool: mysql.Pool | undefined
}

function getPool(): mysql.Pool {
  if (!globalForMySQL.mysqlPool) {
    globalForMySQL.mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQL_PORT || '3307'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'restaurant_billing',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      decimalNumbers: true,
    })
  }
  return globalForMySQL.mysqlPool
}

let _initialized = false

async function ensureInitialized(): Promise<mysql.Pool> {
  const pool = getPool()
  if (!_initialized) {
    await initializeSchema(pool)
    _initialized = true
  }
  return pool
}

// ── Schema Initialization ──────────────────────────
async function initializeSchema(pool: mysql.Pool): Promise<void> {
  const conn = await pool.getConnection()
  try {
    await conn.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)

    await conn.query(`
            CREATE TABLE IF NOT EXISTS menu_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                price DECIMAL(10,2) NOT NULL CHECK(price > 0),
                category_id INT NOT NULL,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)

    await conn.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                token_number INT NOT NULL,
                table_number INT NOT NULL,
                status ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
                total DECIMAL(10,2) NOT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                INDEX idx_orders_status (status),
                INDEX idx_orders_table_number (table_number),
                INDEX idx_orders_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)

    await conn.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                menu_item_id INT NOT NULL,
                name VARCHAR(200) NOT NULL,
                quantity INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                INDEX idx_order_items_order_id (order_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)

    await conn.query(`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                value TEXT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `)

    try {
      await conn.query(`
                ALTER TABLE orders 
                ADD COLUMN payment_method ENUM('CASH', 'ONLINE') NULL
            `)
    } catch (err: unknown) {
      // MySQL error 1060 is ER_DUP_FIELDNAME
      const error = err as { code?: string }
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.error('Failed to add payment_method column:', err)
      }
    }

    // Create index on menu_items category_id if not exists
    // MySQL will ignore duplicate index errors with IF NOT EXISTS in CREATE TABLE,
    // but standalone CREATE INDEX doesn't support IF NOT EXISTS before 8.0.
    // The FK already creates an index, so we skip explicit index creation.
  } finally {
    conn.release()
  }

  // Seed data if tables are empty
  await seedFromJson(pool)
  await seedDefaultSettings(pool)
}

// ── Seed from existing JSON ────────────────────────
async function seedFromJson(pool: mysql.Pool): Promise<void> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as c FROM categories')
  if (rows[0].c > 0) return // Already seeded

  const DATA_DIR = join(process.cwd(), 'data')
  const menuJsonPath = join(DATA_DIR, 'menu.json')
  if (!existsSync(menuJsonPath)) return

  const conn = await pool.getConnection()
  try {
    const raw = readFileSync(menuJsonPath, 'utf-8')
    const data = JSON.parse(raw) as {
      categories: { id: number; name: string }[]
      items: { id: number; name: string; price: number; category: string }[]
    }

    await conn.beginTransaction()

    const catMap = new Map<string, number>()
    for (const cat of data.categories) {
      const [result] = await conn.execute<mysql.ResultSetHeader>(
        'INSERT INTO categories (name) VALUES (?)',
        [cat.name]
      )
      catMap.set(cat.name, result.insertId)
    }

    for (const item of data.items) {
      const catId = catMap.get(item.category)
      if (catId) {
        await conn.execute('INSERT INTO menu_items (name, price, category_id) VALUES (?, ?, ?)', [
          item.name,
          item.price,
          catId,
        ])
      }
    }

    await conn.commit()
    console.log('✅ Seeded database from menu.json')
  } catch (err) {
    await conn.rollback()
    console.error('Failed to seed from menu.json:', err)
  } finally {
    conn.release()
  }
}

async function seedDefaultSettings(pool: mysql.Pool): Promise<void> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT COUNT(*) as c FROM settings')
  if (rows[0].c > 0) return

  const defaults: Record<string, string> = {
    restaurantName: 'Shreeji',
    restaurantAddress: 'Rajkot, Gujarat, India',
    restaurantPhone: '+91 98765 43210',
    restaurantTagline: 'Thank you for dining with us! ✨',
    currencySymbol: '₹',
    currencyCode: 'INR',
    currencyLocale: 'en-IN',
    taxEnabled: 'false',
    taxRate: '0',
    taxLabel: 'GST',
    tableCount: '12',
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    for (const [key, value] of Object.entries(defaults)) {
      await conn.execute('INSERT INTO settings (`key`, value) VALUES (?, ?)', [key, value])
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

// ── Settings ───────────────────────────────────────
export async function getSettings(): Promise<AppSettings> {
  const pool = await ensureInitialized()
  const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT `key`, value FROM settings')
  const map = new Map(rows.map((r: mysql.RowDataPacket) => [r.key, r.value]))

  return {
    restaurantName: (map.get('restaurantName') as string) || 'Restaurant',
    restaurantAddress: (map.get('restaurantAddress') as string) || '',
    restaurantPhone: (map.get('restaurantPhone') as string) || '',
    restaurantTagline: (map.get('restaurantTagline') as string) || '',
    currencySymbol: (map.get('currencySymbol') as string) || '₹',
    currencyCode: (map.get('currencyCode') as string) || 'INR',
    currencyLocale: (map.get('currencyLocale') as string) || 'en-IN',
    taxEnabled: map.get('taxEnabled') === 'true',
    taxRate: parseFloat((map.get('taxRate') as string) || '0'),
    taxLabel: (map.get('taxLabel') as string) || 'GST',
    tableCount: parseInt((map.get('tableCount') as string) || '12'),
  }
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const pool = await ensureInitialized()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await conn.execute(
          'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
          [key, String(value)]
        )
      }
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return getSettings()
}

// ── Categories ─────────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  const pool = await ensureInitialized()
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`
        SELECT c.id, c.name, COUNT(m.id) as itemCount
        FROM categories c
        LEFT JOIN menu_items m ON m.category_id = c.id
        GROUP BY c.id
        ORDER BY c.id
    `)
  return rows as Category[]
}

export async function addCategory(name: string): Promise<Category> {
  const pool = await ensureInitialized()
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'INSERT INTO categories (name) VALUES (?)',
    [name]
  )
  return { id: result.insertId, name, itemCount: 0 }
}

export async function updateCategory(id: number, name: string): Promise<Category | null> {
  const pool = await ensureInitialized()
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'UPDATE categories SET name = ? WHERE id = ?',
    [name, id]
  )
  if (result.affectedRows === 0) return null
  return { id, name }
}

export async function deleteCategory(id: number): Promise<boolean> {
  const pool = await ensureInitialized()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT COUNT(*) as c FROM menu_items WHERE category_id = ?',
      [id]
    )
    if (rows[0].c > 0) {
      await conn.rollback()
      return false // Don't delete category with items
    }
    const [result] = await conn.execute<mysql.ResultSetHeader>(
      'DELETE FROM categories WHERE id = ?',
      [id]
    )
    await conn.commit()
    return result.affectedRows > 0
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

// ── Menu ───────────────────────────────────────────
export async function getMenuItems(): Promise<MenuItem[]> {
  const pool = await ensureInitialized()
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`
        SELECT m.id, m.name, m.price, c.name as category, m.category_id as categoryId
        FROM menu_items m
        JOIN categories c ON c.id = m.category_id
        ORDER BY c.id, m.name
    `)
  return rows as MenuItem[]
}

export async function getMenuItem(id: number): Promise<MenuItem | undefined> {
  const pool = await ensureInitialized()
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `
        SELECT m.id, m.name, m.price, c.name as category, m.category_id as categoryId
        FROM menu_items m
        JOIN categories c ON c.id = m.category_id
        WHERE m.id = ?
    `,
    [id]
  )
  return rows[0] as MenuItem | undefined
}

export async function addMenuItem(
  name: string,
  price: number,
  categoryId: number
): Promise<MenuItem | null> {
  const pool = await ensureInitialized()
  const [catRows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT name FROM categories WHERE id = ?',
    [categoryId]
  )
  if (catRows.length === 0) return null

  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'INSERT INTO menu_items (name, price, category_id) VALUES (?, ?, ?)',
    [name, price, categoryId]
  )
  return {
    id: result.insertId,
    name,
    price,
    category: catRows[0].name,
    categoryId,
  }
}

export async function updateMenuItem(
  id: number,
  updates: { name?: string; price?: number; categoryId?: number }
): Promise<MenuItem | null> {
  const pool = await ensureInitialized()
  const [existingRows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM menu_items WHERE id = ?',
    [id]
  )
  if (existingRows.length === 0) return null

  const existing = existingRows[0]
  const name = updates.name ?? existing.name
  const price = updates.price ?? existing.price
  const categoryId = updates.categoryId ?? existing.category_id

  await pool.execute('UPDATE menu_items SET name = ?, price = ?, category_id = ? WHERE id = ?', [
    name,
    price,
    categoryId,
    id,
  ])
  return (await getMenuItem(id))!
}

export async function deleteMenuItem(id: number): Promise<boolean> {
  const pool = await ensureInitialized()
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    'DELETE FROM menu_items WHERE id = ?',
    [id]
  )
  return result.affectedRows > 0
}

// ── Orders ─────────────────────────────────────────
export async function getOrders(): Promise<Order[]> {
  return (await getOrdersPaginated(1, 1000)).orders
}

export interface PaginatedOrders {
  orders: Order[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getOrdersPaginated(
  page: number = 1,
  limit: number = 20
): Promise<PaginatedOrders> {
  const pool = await ensureInitialized()
  const offset = (page - 1) * limit

  const [totalRows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) as total FROM orders'
  )
  const total = totalRows[0].total

  const limitNum = Number(limit)
  const offsetNum = Number(offset)

  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`
        SELECT
            o.id, o.token_number, o.table_number, o.status, o.payment_method, o.total,
            o.created_at, o.updated_at,
            oi.menu_item_id, oi.name as item_name, oi.quantity, oi.price as item_price
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.id IN (
            SELECT id FROM (
                SELECT id FROM orders ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}
            ) as subq
        )
        ORDER BY o.created_at DESC, oi.id
    `)

  const orders = buildOrdersFromJoinRows(rows)

  return {
    orders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getOrdersByDateRange(from: string, to: string): Promise<Order[]> {
  const pool = await ensureInitialized()
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `
        SELECT
            o.id, o.token_number, o.table_number, o.status, o.payment_method, o.total,
            o.created_at, o.updated_at,
            oi.menu_item_id, oi.name as item_name, oi.quantity, oi.price as item_price
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.created_at >= ? AND o.created_at <= ?
        ORDER BY o.created_at DESC, oi.id
    `,
    [from, to]
  )

  return buildOrdersFromJoinRows(rows)
}

export async function getOrdersByStatus(status: string): Promise<Order[]> {
  const pool = await ensureInitialized()
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `
        SELECT
            o.id, o.token_number, o.table_number, o.status, o.payment_method, o.total,
            o.created_at, o.updated_at,
            oi.menu_item_id, oi.name as item_name, oi.quantity, oi.price as item_price
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = ?
        ORDER BY o.created_at DESC, oi.id
    `,
    [status]
  )

  return buildOrdersFromJoinRows(rows)
}

/** Helper: assemble Order[] from JOIN rows */
function buildOrdersFromJoinRows(rows: mysql.RowDataPacket[]): Order[] {
  const ordersMap = new Map<number, Order>()
  for (const row of rows) {
    if (!ordersMap.has(row.id)) {
      ordersMap.set(row.id, {
        id: row.id,
        tokenNumber: row.token_number,
        tableNumber: row.table_number,
        status: row.status as Order['status'],
        paymentMethod: row.payment_method as Order['paymentMethod'],
        total: parseFloat(row.total),
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
        items: [],
      })
    }
    if (row.menu_item_id != null) {
      ordersMap.get(row.id)!.items.push({
        menuItemId: row.menu_item_id,
        name: row.item_name,
        quantity: row.quantity,
        price: parseFloat(row.item_price),
      })
    }
  }
  return Array.from(ordersMap.values())
}

export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  const pool = await ensureInitialized()
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `
        SELECT menu_item_id as menuItemId, name, quantity, price
        FROM order_items
        WHERE order_id = ?
    `,
    [orderId]
  )
  return rows.map((r) => ({
    menuItemId: r.menuItemId,
    name: r.name,
    quantity: r.quantity,
    price: parseFloat(r.price),
  }))
}

export async function getOrder(id: number): Promise<Order | undefined> {
  const pool = await ensureInitialized()
  const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM orders WHERE id = ?', [
    id,
  ])

  if (rows.length === 0) return undefined

  const o = rows[0]
  return {
    id: o.id,
    tokenNumber: o.token_number,
    tableNumber: o.table_number,
    status: o.status as Order['status'],
    paymentMethod: o.payment_method as Order['paymentMethod'],
    total: parseFloat(o.total),
    createdAt: o.created_at instanceof Date ? o.created_at.toISOString() : o.created_at,
    updatedAt: o.updated_at instanceof Date ? o.updated_at.toISOString() : o.updated_at,
    items: await getOrderItems(o.id),
  }
}

/**
 * Create an order with server-side price verification.
 * Recalculates total from actual menu prices to prevent price tampering.
 */
export async function createOrder(
  items: OrderItem[],
  _clientTotal: number,
  tableNumber: number
): Promise<Order> {
  const pool = await ensureInitialized()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    // Server-side price verification: look up actual prices
    let serverTotal = 0
    for (const item of items) {
      const [priceRows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT price FROM menu_items WHERE id = ?',
        [item.menuItemId]
      )
      if (priceRows.length > 0) {
        item.price = Math.round(parseFloat(priceRows[0].price) * 100) / 100
      }
      serverTotal += Math.round(item.price * item.quantity * 100) / 100
    }

    const total = Math.round(serverTotal * 100) / 100
    const now = new Date()
    const nowFormatted = now.toISOString().slice(0, 19).replace('T', ' ')

    // Generate a daily-sequential kitchen token number
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfDayFormatted = startOfDay.toISOString().slice(0, 19).replace('T', ' ')
    const [countRows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT COUNT(*) as c FROM orders WHERE created_at >= ?',
      [startOfDayFormatted]
    )
    const tokenNumber = countRows[0].c + 1

    const [result] = await conn.execute<mysql.ResultSetHeader>(
      `
            INSERT INTO orders (token_number, table_number, status, total, created_at, updated_at)
            VALUES (?, ?, 'PENDING', ?, ?, ?)
        `,
      [tokenNumber, tableNumber, total, nowFormatted, nowFormatted]
    )

    const orderId = result.insertId

    for (const item of items) {
      await conn.execute(
        `
                INSERT INTO order_items (order_id, menu_item_id, name, quantity, price)
                VALUES (?, ?, ?, ?, ?)
            `,
        [orderId, item.menuItemId, item.name, item.quantity, item.price]
      )
    }

    await conn.commit()

    return (await getOrder(orderId))!
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/**
 * Append new items to an existing order and update its total.
 */
export async function addItemsToOrder(orderId: number, items: OrderItem[]): Promise<Order> {
  const pool = await ensureInitialized()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    // Verify order exists and is PENDING
    const [orderRows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT total, status FROM orders WHERE id = ?',
      [orderId]
    )
    if (orderRows.length === 0) throw new Error('Order not found')
    if (orderRows[0].status !== 'PENDING') throw new Error('Can only add items to PENDING orders')

    const currentTotal = parseFloat(orderRows[0].total)

    // Verify prices and calculate added total
    let addedTotal = 0
    for (const item of items) {
      const [priceRows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT price FROM menu_items WHERE id = ?',
        [item.menuItemId]
      )
      if (priceRows.length > 0) {
        item.price = Math.round(parseFloat(priceRows[0].price) * 100) / 100
      }
      addedTotal += Math.round(item.price * item.quantity * 100) / 100

      // Check if item already exists in this order
      const [existingItemRows] = await conn.execute<mysql.RowDataPacket[]>(
        'SELECT id, quantity FROM order_items WHERE order_id = ? AND menu_item_id = ?',
        [orderId, item.menuItemId]
      )

      if (existingItemRows.length > 0) {
        // Update quantity of existing item
        const newQty = existingItemRows[0].quantity + item.quantity
        await conn.execute('UPDATE order_items SET quantity = ?, price = ? WHERE id = ?', [
          newQty,
          item.price,
          existingItemRows[0].id,
        ])
      } else {
        // Insert new item
        await conn.execute(
          `
                    INSERT INTO order_items (order_id, menu_item_id, name, quantity, price)
                    VALUES (?, ?, ?, ?, ?)
                `,
          [orderId, item.menuItemId, item.name, item.quantity, item.price]
        )
      }
    }

    const newTotal = Math.round((currentTotal + addedTotal) * 100) / 100
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await conn.execute('UPDATE orders SET total = ?, updated_at = ? WHERE id = ?', [
      newTotal,
      now,
      orderId,
    ])

    await conn.commit()
    return (await getOrder(orderId))!
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

export async function getActiveTableOrders(): Promise<Map<number, Order>> {
  const pool = await ensureInitialized()
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(`
        SELECT
            o.id, o.token_number, o.table_number, o.status, o.payment_method, o.total,
            o.created_at, o.updated_at,
            oi.menu_item_id, oi.name as item_name, oi.quantity, oi.price as item_price
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'PENDING' AND o.table_number > 0
        ORDER BY o.table_number, oi.id
    `)

  const activeOrders = new Map<number, Order>()
  for (const row of rows) {
    if (!activeOrders.has(row.table_number)) {
      activeOrders.set(row.table_number, {
        id: row.id,
        tokenNumber: row.token_number,
        tableNumber: row.table_number,
        status: row.status as Order['status'],
        total: parseFloat(row.total),
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
        items: [],
      })
    }
    if (row.menu_item_id != null) {
      activeOrders.get(row.table_number)!.items.push({
        menuItemId: row.menu_item_id,
        name: row.item_name,
        quantity: row.quantity,
        price: parseFloat(row.item_price),
      })
    }
  }
  return activeOrders
}

export async function updateOrderStatus(
  id: number,
  status: 'PENDING' | 'PAID' | 'CANCELLED',
  paymentMethod?: 'CASH' | 'ONLINE'
): Promise<Order | null> {
  const pool = await ensureInitialized()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  if (paymentMethod) {
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      'UPDATE orders SET status = ?, payment_method = ?, updated_at = ? WHERE id = ?',
      [status, paymentMethod, now, id]
    )
    if (result.affectedRows === 0) return null
  } else {
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, id]
    )
    if (result.affectedRows === 0) return null
  }

  return (await getOrder(id)) || null
}

export async function deleteOrder(id: number): Promise<boolean> {
  const pool = await ensureInitialized()
  const [result] = await pool.execute<mysql.ResultSetHeader>('DELETE FROM orders WHERE id = ?', [
    id,
  ])
  return result.affectedRows > 0
}

// ── Dashboard Stats ────────────────────────────────
export async function getDashboardStats() {
  const pool = await ensureInitialized()

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDayFormatted = startOfDay.toISOString().slice(0, 19).replace('T', ' ')

  const [todayOrdersRows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) as c FROM orders WHERE created_at >= ?',
    [startOfDayFormatted]
  )
  const [todayRevenueRows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT COALESCE(SUM(total), 0) as r FROM orders WHERE created_at >= ? AND status = 'PAID'",
    [startOfDayFormatted]
  )
  const [cashRevenueRows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT COALESCE(SUM(total), 0) as r FROM orders WHERE created_at >= ? AND status = 'PAID' AND payment_method = 'CASH'",
    [startOfDayFormatted]
  )
  const [onlineRevenueRows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT COALESCE(SUM(total), 0) as r FROM orders WHERE created_at >= ? AND status = 'PAID' AND payment_method = 'ONLINE'",
    [startOfDayFormatted]
  )
  const [pendingOrdersRows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as c FROM orders WHERE status = 'PENDING'"
  )
  const [occupiedTablesRows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT COUNT(DISTINCT table_number) as c FROM orders WHERE status = 'PENDING' AND table_number > 0"
  )
  const [totalMenuItemsRows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) as c FROM menu_items'
  )

  // Recent orders with JOIN (no N+1)
  const [recentRows] = await pool.execute<mysql.RowDataPacket[]>(`
        SELECT
            o.id, o.token_number, o.table_number, o.status, o.payment_method, o.total,
            o.created_at, o.updated_at,
            oi.menu_item_id, oi.name as item_name, oi.quantity, oi.price as item_price
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.id IN (SELECT id FROM (SELECT id FROM orders ORDER BY created_at DESC LIMIT 5) as subq)
        ORDER BY o.created_at DESC, oi.id
    `)

  const recentOrders = buildOrdersFromJoinRows(recentRows)

  return {
    todayOrders: todayOrdersRows[0].c,
    todayRevenue: Math.round(parseFloat(todayRevenueRows[0].r) * 100) / 100,
    cashRevenue: Math.round(parseFloat(cashRevenueRows[0].r) * 100) / 100,
    onlineRevenue: Math.round(parseFloat(onlineRevenueRows[0].r) * 100) / 100,
    pendingOrders: pendingOrdersRows[0].c,
    occupiedTables: occupiedTablesRows[0].c,
    totalMenuItems: totalMenuItemsRows[0].c,
    recentOrders,
  }
}

// ── Daily Report ───────────────────────────────────
export async function getDailyReport(date: Date) {
  const pool = await ensureInitialized()
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  const startFormatted = startOfDay.toISOString().slice(0, 19).replace('T', ' ')
  const endFormatted = endOfDay.toISOString().slice(0, 19).replace('T', ' ')

  const [totalOrdersRows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT COUNT(*) as c FROM orders WHERE created_at >= ? AND created_at < ?',
    [startFormatted, endFormatted]
  )
  const [paidOrdersRows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as c FROM orders WHERE created_at >= ? AND created_at < ? AND status = 'PAID'",
    [startFormatted, endFormatted]
  )
  const [cancelledOrdersRows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) as c FROM orders WHERE created_at >= ? AND created_at < ? AND status = 'CANCELLED'",
    [startFormatted, endFormatted]
  )
  const [totalRevenueRows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT COALESCE(SUM(total), 0) as r FROM orders WHERE created_at >= ? AND created_at < ? AND status = 'PAID'",
    [startFormatted, endFormatted]
  )

  return {
    date: startOfDay.toISOString(),
    totalOrders: totalOrdersRows[0].c,
    paidOrders: paidOrdersRows[0].c,
    cancelledOrders: cancelledOrdersRows[0].c,
    pendingOrders: totalOrdersRows[0].c - paidOrdersRows[0].c - cancelledOrdersRows[0].c,
    totalRevenue: Math.round(parseFloat(totalRevenueRows[0].r) * 100) / 100,
  }
}
