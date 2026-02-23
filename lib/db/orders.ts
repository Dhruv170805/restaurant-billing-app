import mysql from 'mysql2/promise'
import { ensureInitialized } from './pool'
import { Order, OrderItem, PaginatedOrders } from '@/types'

export async function getOrders(): Promise<Order[]> {
    return (await getOrdersPaginated(1, 1000)).orders
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


export async function getOrder(id: number): Promise<Order | undefined> {
    const pool = await ensureInitialized()
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(`
        SELECT
            o.id, o.token_number, o.table_number, o.status, o.payment_method, o.total,
            o.created_at, o.updated_at,
            oi.menu_item_id, oi.name as item_name, oi.quantity, oi.price as item_price
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.id = ?
    `, [id])

    if (rows.length === 0) return undefined
    return buildOrdersFromJoinRows(rows)[0]
}

export async function createOrder(
    items: OrderItem[],
    _clientTotal: number,
    tableNumber: number
): Promise<Order> {
    const pool = await ensureInitialized()
    const conn = await pool.getConnection()

    try {
        await conn.beginTransaction()

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


export async function updateOrderStatus(
    id: number,
    status: 'PENDING' | 'PAID' | 'CANCELLED',
    paymentMethod?: 'CASH' | 'ONLINE'
): Promise<Order | null> {
    const pool = await ensureInitialized()
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    let query = 'UPDATE orders SET status = ?, updated_at = ?'
    let params: any[] = [status, now]

    if (paymentMethod) {
        query = 'UPDATE orders SET status = ?, payment_method = ?, updated_at = ?'
        params = [status, paymentMethod, now]
    }

    query += ' WHERE id = ?'
    params.push(id)

    const [result] = await pool.execute<mysql.ResultSetHeader>(query, params)
    if (result.affectedRows === 0) return null
    return getOrder(id) as Promise<Order>
}

export async function deleteOrder(id: number): Promise<boolean> {
    const pool = await ensureInitialized()
    const conn = await pool.getConnection()
    try {
        await conn.beginTransaction()
        // Delete items first due to foreign key constraints if not cascading
        await conn.execute('DELETE FROM order_items WHERE order_id = ?', [id])
        const [result] = await conn.execute<mysql.ResultSetHeader>('DELETE FROM orders WHERE id = ?', [
            id,
        ])
        await conn.commit()
        return result.affectedRows > 0
    } catch (err) {
        await conn.rollback()
        throw err
    } finally {
        conn.release()
    }
}


function buildOrdersFromJoinRows(rows: mysql.RowDataPacket[]): Order[] {
    const ordersMap = new Map<number, Order>()
    for (const row of rows) {
        if (!ordersMap.has(row.id)) {
            ordersMap.set(row.id, {
                id: row.id,
                tokenNumber: row.token_number,
                tableNumber: row.table_number,
                status: row.status,
                paymentMethod: row.payment_method,
                total: parseFloat(row.total),
                subtotal: parseFloat(row.total), // Simplified
                tax: 0, // Simplified
                createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
                updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
                items: [],
            })
        }
        if (row.menu_item_id != null) {
            ordersMap.get(row.id)!.items.push({
                id: 0, // Not stored in DB directly as separate ID in results here
                orderId: row.id,
                menuItemId: row.menu_item_id,
                name: row.item_name,
                quantity: row.quantity,
                price: parseFloat(row.item_price),
                menuItem: { name: row.item_name, category: { name: '' } } // Simplified
            })
        }
    }
    return Array.from(ordersMap.values())
}
