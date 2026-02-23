import { ensureInitialized } from './mongo'
import { TableInfo, DashboardStats } from '@/types'
import { getOrders } from './orders'
import { getSettings } from './settings'
import { DbOrder } from './schema'

export async function getTables(): Promise<TableInfo[]> {
    const db = await ensureInitialized()
    const settings = await getSettings()
    const tableCount = settings.tableCount || 12

    const docs = await db.collection<DbOrder>('orders').aggregate([
        { $match: { status: 'PENDING', tableNumber: { $gt: 0 } } },
        {
            $project: {
                _id: 1,
                tokenNumber: '$tokenNumber',
                tableNumber: '$tableNumber',
                total: '$total',
                createdAt: '$createdAt',
                itemCount: { $size: { $ifNull: ['$items', []] } }
            }
        }
    ]).toArray()

    const activeOrders = new Map<number, { id: number, tokenNumber: number, total: number, itemCount: number, createdAt: string }>()
    for (const doc of docs) {
        activeOrders.set(doc.tableNumber, {
            id: doc._id,
            tokenNumber: doc.tokenNumber,
            total: doc.total,
            itemCount: doc.itemCount,
            createdAt: doc.createdAt,
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
    const db = await ensureInitialized()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')

    const statsArray = await db.collection<DbOrder>('orders').aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        {
            $group: {
                _id: null,
                todayRevenue: {
                    $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$total', 0] }
                },
                cashRevenue: {
                    $sum: { $cond: [{ $and: [{ $eq: ['$status', 'PAID'] }, { $eq: ['$paymentMethod', 'CASH'] }] }, '$total', 0] }
                },
                onlineRevenue: {
                    $sum: { $cond: [{ $and: [{ $eq: ['$status', 'PAID'] }, { $eq: ['$paymentMethod', 'ONLINE'] }] }, '$total', 0] }
                },
                todayOrders: { $sum: 1 },
                pendingOrders: {
                    $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
                }
            }
        }
    ]).toArray()

    const stats = statsArray[0] || {
        todayRevenue: 0,
        cashRevenue: 0,
        onlineRevenue: 0,
        todayOrders: 0,
        pendingOrders: 0
    }

    const allOrders = await getOrders()
    const recentOrders = allOrders.slice(0, 10)

    return {
        todayRevenue: stats.todayRevenue,
        cashRevenue: stats.cashRevenue,
        onlineRevenue: stats.onlineRevenue,
        todayOrders: stats.todayOrders,
        pendingOrders: stats.pendingOrders,
        recentOrders,
    }
}
