import { ensureInitialized } from './mongo'
import { DbTableInfo as TableInfo, DbDashboardStats as DashboardStats } from './schema'

import { getSettings } from './settings'
import { DbOrder } from './schema'

export async function getTables(): Promise<TableInfo[]> {
  const db = await ensureInitialized()
  const settings = await getSettings()
  const tableCount = settings.tableCount || 12

  const docs = await db
    .collection<DbOrder>('orders')
    .aggregate([
      { $match: { status: 'PENDING', tableNumber: { $gt: 0 } } },
      {
        $project: {
          _id: 1,
          tokenNumber: '$tokenNumber',
          tableNumber: '$tableNumber',
          total: '$total',
          createdAt: '$createdAt',
          itemCount: { $size: { $ifNull: ['$items', []] } },
        },
      },
    ])
    .toArray()

  const activeOrders = new Map<
    number,
    { id: number; tokenNumber: number; total: number; itemCount: number; createdAt: string }
  >()
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

  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')

  const results = await db
    .collection<DbOrder>('orders')
    .aggregate([
      {
        $facet: {
          // ── Main stats aggregate ──
          mainStats: [
            { $match: { createdAt: { $gte: monthStart } } },
            {
              $group: {
                _id: null,
                monthlyRevenue: {
                  $sum: { $cond: [{ $in: ['$status', ['PAID']] }, '$total', 0] },
                },
                monthlyOrders: {
                  $sum: { $cond: [{ $in: ['$status', ['PAID', 'UNPAID']] }, 1, 0] },
                },
                todayRevenue: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$createdAt', todayStart] }, { $eq: ['$status', 'PAID'] }] },
                      '$total',
                      0,
                    ],
                  },
                },
                cashRevenue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ['$createdAt', todayStart] },
                          { $eq: ['$status', 'PAID'] },
                          { $eq: ['$paymentMethod', 'CASH'] },
                        ],
                      },
                      '$total',
                      0,
                    ],
                  },
                },
                onlineRevenue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ['$createdAt', todayStart] },
                          { $eq: ['$status', 'PAID'] },
                          { $eq: ['$paymentMethod', 'ONLINE'] },
                        ],
                      },
                      '$total',
                      0,
                    ],
                  },
                },
                unpaidRevenue: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$createdAt', todayStart] }, { $eq: ['$status', 'UNPAID'] }] },
                      '$total',
                      0,
                    ],
                  },
                },
                todayOrders: {
                  $sum: { $cond: [{ $gte: ['$createdAt', todayStart] }, 1, 0] },
                },
                pendingOrders: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$createdAt', todayStart] }, { $eq: ['$status', 'PENDING'] }] },
                      1,
                      0,
                    ],
                  },
                },
                yesterdayRevenue: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ['$createdAt', yesterdayStart] },
                          { $lt: ['$createdAt', todayStart] },
                          { $eq: ['$status', 'PAID'] },
                        ],
                      },
                      '$total',
                      0,
                    ],
                  },
                },
                avgOrderValue: {
                  $avg: { $cond: [{ $eq: ['$status', 'PAID'] }, '$total', null] },
                },
              },
            },
          ],
          // ── Top selling items (7-day window) ──
          topItems: [
            { $match: { status: 'PAID', createdAt: { $gte: sevenDaysAgo } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.name',
                qty: { $sum: '$items.quantity' },
                revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
              },
            },
            { $sort: { qty: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, name: '$_id', qty: 1, revenue: 1 } },
          ],
          // ── Recent orders (Today) ──
          recentOrders: [
            { $match: { createdAt: { $gte: todayStart } } },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
          ],
          // ── All unpaid orders ──
          unpaidOrders: [
            { $match: { status: 'UNPAID' } },
            { $sort: { createdAt: -1 } },
          ],
          // ── Weekly totals (for AI) ──
          weeklyData: [
            { $match: { status: 'PAID', createdAt: { $gte: sevenDaysAgo } } },
            { $project: { total: 1, createdAt: 1 } },
          ],
        },
      },
    ])
    .toArray()

  const data = results[0]
  const stats = data.mainStats[0] || {
    monthlyRevenue: 0,
    monthlyOrders: 0,
    todayRevenue: 0,
    cashRevenue: 0,
    onlineRevenue: 0,
    unpaidRevenue: 0,
    todayOrders: 0,
    pendingOrders: 0,
    yesterdayRevenue: 0,
    avgOrderValue: 0,
  }

  // Calculate weekly avg from weeklyData
  const weeklyTotals = [0, 0, 0, 0, 0, 0, 0]
  const weeklyCounts = [0, 0, 0, 0, 0, 0, 0]
  for (const o of data.weeklyData) {
    const day = new Date(o.createdAt).getDay()
    weeklyTotals[day] += o.total
    weeklyCounts[day]++
  }
  const weeklyAvg = weeklyTotals.map((t, i) => (weeklyCounts[i] > 0 ? Math.round(t / weeklyCounts[i]) : 0))

  return {
    todayRevenue: stats.todayRevenue,
    monthlyRevenue: stats.monthlyRevenue,
    cashRevenue: stats.cashRevenue,
    onlineRevenue: stats.onlineRevenue,
    unpaidRevenue: stats.unpaidRevenue,
    todayOrders: stats.todayOrders,
    monthlyOrders: stats.monthlyOrders,
    pendingOrders: stats.pendingOrders,
    yesterdayRevenue: stats.yesterdayRevenue ?? 0,
    avgOrderValue: Math.round(stats.avgOrderValue ?? 0),
    topItems: data.topItems as { name: string; qty: number; revenue: number }[],
    weeklyAvg,
    recentOrders: data.recentOrders.map((d: any) => ({ ...d, id: d._id })),
    unpaidOrders: data.unpaidOrders.map((d: any) => ({ ...d, id: d._id })),
  }
}
