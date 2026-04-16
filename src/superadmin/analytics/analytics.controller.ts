import { Controller, Get, UseGuards } from '@nestjs/common';
import { SuperAdminJwtGuard } from '../../common/guards/superadmin-jwt.guard';
import { query } from '@/lib/db/postgres';

/**
 * SuperAdmin Analytics Controller.
 * Provides the "God-Mode" aerial view of the platform's performance.
 * Guarded by mandatory 2FA security validation.
 */
@Controller('superadmin/analytics')
@UseGuards(SuperAdminJwtGuard)
export class AnalyticsController {
  
  @Get()
  async getGlobalStats() {
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

    // 4. Critical Health: Database size
    const dbMetrics = await query<{ size: string }>('SYSTEM', "SELECT pg_size_pretty(pg_database_size(current_database())) as size");

    return {
      revenue30d: revenueRes[0].total || '0',
      tenants: tenantsByPlan,
      velocity: dailyOrders,
      dbSize: dbMetrics[0].size
    };
  }
}
