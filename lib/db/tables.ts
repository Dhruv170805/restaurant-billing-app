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

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  const yesterdayStart = yesterday.toISOString().slice(0, 19).replace('T', ' ')
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')

  // ── Main aggregate ──────────────────────────────────────────────────────────
  const statsArray = await db
    .collection<DbOrder>('orders')
    .aggregate([
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
            $avg: {
              $cond: [{ $eq: ['$status', 'PAID'] }, '$total', null],
            },
          },
        },
      },
    ])
    .toArray()

  const stats = statsArray[0] || {
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

  // ── Top selling items (7-day window) ───────────────────────────────────────
  const topItemsPipeline = await db
    .collection<DbOrder>('orders')
    .aggregate([
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
    ])
    .toArray()

  // ── Weekly revenue by day-of-week (for AI prediction) ─────────────────────
  const weeklyOrders = await db
    .collection<DbOrder>('orders')
    .find({ status: 'PAID', createdAt: { $gte: sevenDaysAgo } })
    .project({ total: 1, createdAt: 1 })
    .toArray()

  // Build 7-element array [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  const weeklyTotals = [0, 0, 0, 0, 0, 0, 0]
  const weeklyCounts = [0, 0, 0, 0, 0, 0, 0]
  for (const o of weeklyOrders) {
    const day = new Date(o.createdAt).getDay()
    weeklyTotals[day] += o.total
    weeklyCounts[day]++
  }
  const weeklyAvg = weeklyTotals.map((t, i) => (weeklyCounts[i] > 0 ? Math.round(t / weeklyCounts[i]) : 0))

  // ── Recent & unpaid orders ─────────────────────────────────────────────────
  const recentOrders = await db
    .collection<DbOrder>('orders')
    .find({ createdAt: { $gte: todayStart } })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray()

  const unpaidOrders = await db
    .collection<DbOrder>('orders')
    .find({ status: 'UNPAID' })
    .sort({ createdAt: -1 })
    .toArray()

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
    topItems: topItemsPipeline as { name: string; qty: number; revenue: number }[],
    weeklyAvg,
    recentOrders: recentOrders.map(
      (doc: DbOrder) => ({ ...doc, id: doc._id }) as unknown as DbOrder
    ),
    unpaidOrders: unpaidOrders.map(
      (doc: DbOrder) => ({ ...doc, id: doc._id }) as unknown as DbOrder
    ),
  }
}
