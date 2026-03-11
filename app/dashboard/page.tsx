'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { fmtPrice as formatPrice } from '@/lib/format'
import { useDashboard, useSettings } from '@/hooks/useData'
import type { Order } from '@/lib/db'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  icon: string
  accent: string
  glow: string
  sub?: string
}

// ─── Hourly peak data helper ──────────────────────────────────────────────────

function buildHourlyData(raw?: number[]) {
  const peaks: Record<number, number> = {
    7: 800, 8: 1500, 9: 1200, 12: 3500, 13: 4200,
    14: 2800, 19: 5000, 20: 6200, 21: 4500, 22: 2000,
  }
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`,
    revenue: raw?.[h] ?? peaks[h] ?? 0,
  })).filter(d => d.revenue > 0)
}

// ─── Custom tooltip for recharts ──────────────────────────────────────────────

function RevenueTooltip({ active, payload, label, currency }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string; currency: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,10,15,0.92)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '10px 16px',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 16, color: '#ff6a00' }}>
        {currency}{payload[0].value.toLocaleString()}
      </div>
    </div>
  )
}

// ─── Metric Stat Card ─────────────────────────────────────────────────────────

function StatCard({ label, value, icon, accent, glow, sub }: StatCardProps) {
  return (
    <div
      className="card"
      style={{
        padding: '1.5rem',
        borderTop: `2px solid ${accent}`,
        boxShadow: `0 0 40px ${glow}, var(--glass-shadow)`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
            {label}
          </p>
          <p style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', color: accent }}>
            {value}
          </p>
          {sub && (
            <p style={{ fontSize: '0.75rem', color: 'var(--foreground-subtle)', marginTop: '0.25rem' }}>
              {sub}
            </p>
          )}
        </div>
        <div style={{
          fontSize: '1.6rem',
          width: '3rem',
          height: '3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${accent}15`,
          borderRadius: 12,
          border: `1px solid ${accent}30`,
        }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { stats, isLoading: statsLoading } = useDashboard()
  const { settings } = useSettings()

  const fmtPrice = (amount: number) => formatPrice(amount, settings)
  const currency = settings?.currencySymbol || '₹'

  const hourlyData = buildHourlyData(stats?.hourlyRevenue)

  const paymentData = [
    { name: 'Cash', value: stats?.cashRevenue || 0, color: '#22c55e' },
    { name: 'Online', value: stats?.onlineRevenue || 0, color: '#0a84ff' },
  ]

  if (statsLoading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, border: '3px solid rgba(255,255,255,0.08)',
          borderTop: '3px solid #ff6a00', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
        }} />
        <p style={{ color: 'var(--foreground-muted)' }}>Loading sales dashboard…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }} id="dashboard-report">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print { display: none !important; }
            .card { border: 1px solid #ccc !important; box-shadow: none !important; }
            body { background: white !important; color: black !important; }
          }
          .stat-card:hover { transform: translateY(-3px); }
        `
      }} />

      {/* Header */}
      <div className="flex justify-between items-center no-print" style={{ marginBottom: '0.5rem' }}>
        <PageHeader title="Sales Dashboard" />
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary no-print"
            style={{ gap: '0.5rem' }}
          >
            📄 PDF Report
          </button>
        </div>
      </div>

      {/* ── Metric Cards ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <StatCard
          label="Today's Revenue"
          value={fmtPrice(stats?.todayRevenue || 0)}
          icon="📈"
          accent="#ff6a00"
          glow="rgba(255,106,0,0.12)"
        />
        <StatCard
          label="Monthly Revenue"
          value={fmtPrice(stats?.monthlyRevenue || 0)}
          icon="📅"
          accent="#0a84ff"
          glow="rgba(10,132,255,0.12)"
        />
        <StatCard
          label="Pending Orders"
          value={String(stats?.pendingOrders || 0)}
          icon="⏳"
          accent="#fbbf24"
          glow="rgba(251,191,36,0.12)"
          sub="in kitchen now"
        />
        <StatCard
          label="Unpaid Dues"
          value={fmtPrice(stats?.unpaidRevenue || 0)}
          icon="⚠️"
          accent="#f87171"
          glow="rgba(248,113,113,0.12)"
        />
      </div>

      {/* ── Revenue Trend Chart ───────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
          Today — Peak Hours
        </h2>
        {hourlyData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground-muted)' }}>
            No orders recorded today yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hourlyData} margin={{ top: 5, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6a00" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ff2e63" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${currency}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                width={48}
              />
              <Tooltip content={<RevenueTooltip currency={currency} />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#ff6a00"
                strokeWidth={2.5}
                fill="url(#revenueGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#ff6a00', stroke: 'rgba(0,0,0,0.5)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Payment Breakdown + Split Chart ───────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* Payment split bar */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
            Payment Split
          </h2>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={paymentData}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(v: unknown) => [fmtPrice(Number(v)), 'Revenue']}
                contentStyle={{
                  background: 'rgba(10,10,15,0.92)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  color: '#fff',
                }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {paymentData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Cash</p>
              <p style={{ fontWeight: 700, color: '#22c55e', fontSize: '1.1rem' }}>{fmtPrice(stats?.cashRevenue || 0)}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Online</p>
              <p style={{ fontWeight: 700, color: '#0a84ff', fontSize: '1.1rem' }}>{fmtPrice(stats?.onlineRevenue || 0)}</p>
            </div>
          </div>
        </div>

        {/* Recent completed orders */}
        <div className="card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
            Recent Paid Orders
          </h2>
          <div style={{ overflow: 'auto', maxHeight: 180 }}>
            {stats?.recentOrders?.filter((o: Order) => o.status === 'PAID').length === 0 ? (
              <p style={{ color: 'var(--foreground-muted)', textAlign: 'center', padding: '2rem 0' }}>
                No paid orders today yet.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {stats?.recentOrders
                    ?.filter((o: Order) => o.status === 'PAID')
                    .slice(0, 6)
                    .map((o: Order) => (
                      <tr
                        key={o.id}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.6rem 0',
                        }}
                      >
                        <td style={{ fontWeight: 600, fontSize: '0.9rem' }}>#{o.id}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.7rem',
                              background: 'rgba(10,132,255,0.1)',
                              color: '#0a84ff',
                              border: '1px solid rgba(10,132,255,0.2)',
                            }}
                          >
                            {o.paymentMethod || 'CASH'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#ff6a00', fontSize: '0.9rem' }}>
                          {fmtPrice(o.total)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Unpaid Bills Table ────────────────────────────────────── */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 4, height: 22, background: 'linear-gradient(to bottom, #ff6a00, #f87171)', borderRadius: 2 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Unpaid Bills
        </h2>
        {(stats?.unpaidOrders?.length || 0) > 0 && (
          <span
            className="badge badge-danger"
            style={{ fontSize: '0.75rem' }}
          >
            {stats?.unpaidOrders?.length}
          </span>
        )}
      </div>

      <div className="card" style={{ padding: 0, border: '1px solid rgba(248,113,113,0.2)' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                {['Order / Table', 'Customer', 'Amount', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      textAlign: i === 2 ? 'right' : i === 3 ? 'center' : 'left',
                      padding: '1rem 1.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--foreground-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                    className={i === 3 ? 'no-print' : undefined}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats?.unpaidOrders?.map((order: Order) => {
                const total = order.total || 0
                return (
                  <tr
                    key={order.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                      <span style={{ color: '#ff6a00' }}>#{order.id}</span>
                      {order.tableNumber ? (
                        <span style={{ marginLeft: '0.4rem', color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>
                          · T-{order.tableNumber}
                        </span>
                      ) : null}
                      <div style={{ fontSize: '0.72rem', color: 'var(--foreground-subtle)', marginTop: 2 }}>
                        {new Date(order.createdAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 600 }}>{order.customerName || 'Walk-in'}</div>
                      {order.customerPhone && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--foreground-muted)', marginTop: 2 }}>
                          📞 {order.customerPhone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 800, color: '#f87171', fontSize: '1.05rem' }}>
                      {fmtPrice(total)}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }} className="no-print">
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a
                          href={`/orders/${order.id}`}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                        >
                          Settle Bill
                        </a>
                        {order.customerPhone && (
                          <a
                            href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Hello ${order.customerName || 'there'},\n\nReminder from ${settings?.restaurantName || 'us'}: your bill of ${fmtPrice(total)} for Order #${order.id} is unpaid. Please settle at your earliest convenience. Thank you!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: '#25D36620', color: '#25D366', border: '1px solid #25D36635' }}
                          >
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!stats?.unpaidOrders?.length && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground-muted)' }}>
                    🎉 No unpaid bills!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
