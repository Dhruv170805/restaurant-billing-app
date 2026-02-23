import mysql from 'mysql2/promise'
import { ensureInitialized } from './pool'
import { TableInfo, DashboardStats } from '@/types'
import { getOrders } from './orders'

export async function getTables(): Promise<TableInfo[]> {
    const pool = await ensureInitialized()
    const { getSettings } = await import('./settings')
    const settings = await getSettings()
    const tableCount = 12 // Default or from settings if we added it

    const [rows] = await pool.execute<mysql.RowDataPacket[]>(`
        SELECT
            o.id, o.token_number, o.table_number, o.status, o.total, o.created_at,
            COUNT(oi.id) as itemCount
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = 'PENDING' AND o.table_number > 0
        GROUP BY o.id
    `)

    const activeOrders = new Map<number, any>()
    for (const row of rows) {
        activeOrders.set(row.table_number, {
            id: row.id,
            tokenNumber: row.token_number,
            total: parseFloat(row.total),
            itemCount: row.itemCount,
            createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        })
    }

    const tables: TableInfo[] = []
    for (let i = 1; i <= tableCount; i++) {
        const order = activeOrders.get(i) || null
        tables.push({
            number: i,
            status: order ? 'occupied' : 'available',
            order,
        })
    }

    return tables
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const pool = await ensureInitialized()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')

    const [rows] = await pool.execute<mysql.RowDataPacket[]>(`
        SELECT 
            SUM(CASE WHEN status = 'PAID' THEN total ELSE 0 END) as todayRevenue,
            SUM(CASE WHEN status = 'PAID' AND payment_method = 'CASH' THEN total ELSE 0 END) as cashRevenue,
            SUM(CASE WHEN status = 'PAID' AND payment_method = 'ONLINE' THEN total ELSE 0 END) as onlineRevenue,
            COUNT(id) as todayOrders,
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pendingOrders
        FROM orders
        WHERE created_at >= ?
    `, [todayStart])

    const stats = rows[0]
    const allOrders = await getOrders()
    const recentOrders = allOrders.slice(0, 10)

    return {
        todayRevenue: parseFloat(stats.todayRevenue || 0),
        cashRevenue: parseFloat(stats.cashRevenue || 0),
        onlineRevenue: parseFloat(stats.onlineRevenue || 0),
        todayOrders: stats.todayOrders || 0,
        pendingOrders: stats.pendingOrders || 0,
        recentOrders,
    }
}
