import { NextResponse } from 'next/server';
import { register, Counter, Gauge, Histogram } from 'prom-client';
import { query } from '@/lib/db/postgres';

// -- Register Metrics --
const orderCounter = new Counter({
  name: 'nexus_orders_total',
  help: 'Total number of orders created across the platform',
});

const tenantGauge = new Gauge({
  name: 'nexus_active_tenants',
  help: 'Number of active tenants in the platform',
});

const revenueGauge = new Gauge({
  name: 'nexus_total_revenue_daily',
  help: 'Total revenue processed in the last 24 hours',
});

/**
 * High-performance Metrics Endpoint.
 * Exposed to the Prometheus scraper at /api/metrics.
 * Provides a "God-Level" bird's eye view of the entire SaaS platform's health and revenue.
 */
export async function GET() {
  try {
    // 1. Fetch Real-time Aggregations from PostgreSQL
    const tenantRes = await query<{ count: string }>('SYSTEM', 'SELECT COUNT(*) as count FROM tenants');
    const orderRes = await query<{ count: string }>('SYSTEM', 'SELECT COUNT(*) as count FROM orders');
    const revenueRes = await query<{ sum: string }>('SYSTEM', 
      "SELECT SUM(total) as sum FROM orders WHERE status = 'PAID' AND created_at >= NOW() - INTERVAL '24 hours'"
    );

    // 2. Update Prometheus Gauges
    tenantGauge.set(parseInt(tenantRes[0].count));
    orderCounter.inc(parseInt(orderRes[0].count));
    revenueGauge.set(parseFloat(revenueRes[0].sum || '0'));

    // 3. Output in Prometheus Text Format
    const metrics = await register.metrics();
    return new Response(metrics, {
      headers: { 'Content-Type': register.contentType },
    });
  } catch (err) {
    console.error('📊 Metrics collection failed:', err);
    return NextResponse.json({ error: 'Metrics unavailable' }, { status: 500 });
  }
}
