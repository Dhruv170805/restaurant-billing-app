import { NextResponse } from 'next/server';
import { query } from '@/lib/db/postgres';
import { getSuperAdminSession } from '@/lib/next_auth_utils';

/**
 * Platform-Wide Analytics Engine (Global View).
 * Aggregates high-velocity financial and operational data across all tenants.
 */
export async function GET() {
  try {
    const session = await getSuperAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Total Revenue (Last 30 Days)
    const revenueRes = await query<{ total: string }>('SYSTEM', `
      SELECT SUM(total) as total 
      FROM orders 
      WHERE status = 'PAID' AND created_at >= NOW() - INTERVAL '30 days'
    `);

    // 2. Active Tenants by Plan
    const tenantsByPlan = await query<{ plan: string, count: string }>('SYSTEM', `
      SELECT plan, COUNT(*) as count 
      FROM tenants 
      GROUP BY plan
    `);

    // 3. Global Order Velocity (daily counts for the last 7 days)
    const dailyOrders = await query<{ date: string, count: string }>('SYSTEM', `
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    // 4. Critical Health: Database size & connection count (simplified)
    const dbMetrics = await query<{ size: string }>('SYSTEM', "SELECT pg_size_pretty(pg_database_size(current_database())) as size");

    return NextResponse.json({
      revenue30d: revenueRes[0].total || '0',
      tenants: tenantsByPlan,
      velocity: dailyOrders,
      dbSize: dbMetrics[0].size
    });

  } catch (err) {
    console.error('Global analytics error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
