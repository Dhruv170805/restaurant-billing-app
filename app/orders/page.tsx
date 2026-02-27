'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { fmtPrice as formatPrice } from '@/lib/format'
import { useOrders, useSettings } from '@/hooks/useData'

// No need to import Order or AppSettings when not directly instantiating them here

export default function OrdersPage() {
  const { orders, isLoading: ordersLoading } = useOrders()
  const { settings } = useSettings()

  const fmtPrice = (amount: number) => formatPrice(amount, settings)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders History"
        description="View and manage all past orders"
        action={
          <Link href="/pos" className="btn btn-primary">
            ⚡ New Order
          </Link>
        }
      />

      <div className="card">
        {ordersLoading ? (
          <p style={{ color: 'var(--foreground-subtle)', padding: '2rem', textAlign: 'center' }}>
            Loading orders...
          </p>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground-subtle)' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</p>
            <p>No orders yet. Create one from the POS terminal.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>#{order.id}</td>
                    <td style={{ color: 'var(--foreground-muted)' }}>
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td>{order.items.length} items</td>
                    <td style={{ fontWeight: 600 }}>{fmtPrice(order.total)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>
                      <Link
                        href={`/orders/${order.id}`}
                        className="btn btn-secondary text-sm py-1 px-3"
                      >
                        View Bill
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
