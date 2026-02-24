'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { formatPriceWithSettings } from '@/lib/pricing'
import { useDashboard, useSettings } from '@/hooks/useData'
import type { Order } from '@/lib/db'

export default function DashboardPage() {
  const { stats, isLoading: statsLoading } = useDashboard()
  const { settings } = useSettings()

  const fmtPrice = (amount: number) => {
    if (!settings) return `$${amount.toFixed(2)}`
    return formatPriceWithSettings(amount, settings.currencyLocale, settings.currencyCode)
  }

  if (statsLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
        Loading sales dashboard...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 print-area" id="dashboard-report">
      <div
        className="flex justify-between items-center print-area-hide"
        style={{ marginBottom: '-1rem' }}
      >
        <PageHeader title="Sales Dashboard" />
        <button
          onClick={() => window.print()}
          className="btn btn-primary"
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          📄 Download PDF Report
        </button>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}
      >
        <div className="card" style={{ padding: '2rem', borderTop: '4px solid var(--primary)' }}>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>
            Today&apos;s Revenue
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>
            {fmtPrice(stats?.todayRevenue || 0)}
          </p>
        </div>
        <div className="card" style={{ padding: '2rem', borderTop: '4px solid var(--accent)' }}>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>
            Monthly Revenue
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>
            {fmtPrice(stats?.monthlyRevenue || 0)}
          </p>
        </div>
        <div className="card" style={{ padding: '2rem', borderTop: '4px solid var(--warning)' }}>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>
            Unpaid Dues
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warning-text)' }}>
            {fmtPrice(stats?.unpaidRevenue || 0)}
          </p>
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1.5rem' }}>
        Payment Breakdown
      </h2>
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}
      >
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
          <div className="flex justify-between items-center">
            <div>
              <p
                style={{
                  color: 'var(--foreground-muted)',
                  fontSize: '0.9rem',
                  marginBottom: '0.25rem',
                }}
              >
                Cash Payments
              </p>
              <p style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                {fmtPrice(stats?.cashRevenue || 0)}
              </p>
            </div>
            <span style={{ fontSize: '2.5rem' }}>💵</span>
          </div>
        </div>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
          <div className="flex justify-between items-center">
            <div>
              <p
                style={{
                  color: 'var(--foreground-muted)',
                  fontSize: '0.9rem',
                  marginBottom: '0.25rem',
                }}
              >
                Online Payments
              </p>
              <p style={{ fontSize: '1.8rem', fontWeight: 700 }}>
                {fmtPrice(stats?.onlineRevenue || 0)}
              </p>
            </div>
            <span style={{ fontSize: '2.5rem' }}>💳</span>
          </div>
        </div>
      </div>

      <h2
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          marginTop: '2rem',
          marginBottom: '1rem',
          color: 'var(--warning)',
        }}
      >
        📓 Unpaid Bills
      </h2>
      <div className="card" style={{ padding: '0', border: '1px solid var(--warning)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <th
                style={{
                  textAlign: 'left',
                  padding: '1.25rem 1.5rem',
                  fontWeight: 600,
                  color: 'var(--foreground-muted)',
                }}
              >
                Order ID / Table
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '1.25rem 1.5rem',
                  fontWeight: 600,
                  color: 'var(--foreground-muted)',
                }}
              >
                Customer Info
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '1.25rem 1.5rem',
                  fontWeight: 600,
                  color: 'var(--foreground-muted)',
                }}
              >
                Total Dues
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '1.25rem 1.5rem',
                  fontWeight: 600,
                  color: 'var(--foreground-muted)',
                }}
                className="print-area-hide"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {stats?.unpaidOrders?.map((order: Order) => (
              <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>
                  #{order.id} {order.tableNumber && `(T-${order.tableNumber})`}
                  <br />
                  <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary-light)' }}>
                    {order.customerName || 'Unknown'}
                  </div>
                  {order.customerPhone && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--foreground-muted)',
                        marginTop: '0.2rem',
                      }}
                    >
                      📞 {order.customerPhone}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '1.25rem 1.5rem',
                    fontWeight: 700,
                    color: 'var(--warning)',
                  }}
                >
                  {fmtPrice(order.total)}
                </td>
                <td
                  style={{ textAlign: 'center', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}
                  className="print-area-hide"
                >
                  <a
                    href={`/orders/${order.id}`}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%' }}
                  >
                    Settle Bill
                  </a>
                  {order.customerPhone && (
                    <a
                      href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hello ${order.customerName || 'there'},\n\nThis is a friendly reminder from ${settings?.restaurantName || 'our restaurant'} regarding your unpaid bill of ${fmtPrice(order.total)} for Order #${order.id}.\n\nPlease arrange a settlement at your earliest convenience. Thank you!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                        backgroundColor: '#25D366',
                        color: 'white',
                        border: 'none',
                        width: '100%'
                      }}
                    >
                      💬 WhatsApp
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {stats?.unpaidOrders?.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{ textAlign: 'center', padding: '2rem', color: 'var(--foreground-muted)' }}
                >
                  No unpaid bills! 🎉
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2
        style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '2rem', marginBottom: '1rem' }}
        className="print-area-hide"
      >
        Recent Completed Orders
      </h2>
      <div className="card print-area-hide" style={{ padding: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <th
                style={{
                  textAlign: 'left',
                  padding: '1.25rem 1.5rem',
                  fontWeight: 600,
                  color: 'var(--foreground-muted)',
                }}
              >
                Order ID
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '1.25rem 1.5rem',
                  fontWeight: 600,
                  color: 'var(--foreground-muted)',
                }}
              >
                Method
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '1.25rem 1.5rem',
                  fontWeight: 600,
                  color: 'var(--foreground-muted)',
                }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {stats?.recentOrders
              ?.filter((o: Order) => o.status === 'PAID')
              .map((order: Order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>#{order.id}</td>
                  <td style={{ textAlign: 'center', padding: '1.25rem 1.5rem' }}>
                    <span
                      className="badge"
                      style={{ background: 'var(--glass-bg)', color: 'var(--foreground)' }}
                    >
                      {order.paymentMethod || 'CASH'}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      padding: '1.25rem 1.5rem',
                      fontWeight: 700,
                      color: 'var(--primary-light)',
                    }}
                  >
                    {fmtPrice(order.total)}
                  </td>
                </tr>
              ))}
            {stats?.recentOrders?.filter((o: Order) => o.status === 'PAID').length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{ textAlign: 'center', padding: '2rem', color: 'var(--foreground-muted)' }}
                >
                  No completed orders yet today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
