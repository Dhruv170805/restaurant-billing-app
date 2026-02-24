'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatPriceWithSettings } from '@/lib/pricing'

interface OrderItem {
  id: number
  quantity: number
  priceAtOrder: number
  menuItem: {
    name: string
  }
}

interface Order {
  id: number
  createdAt: string
  total: number
  status: string
  paymentMethod?: 'CASH' | 'ONLINE' | 'UNPAID'
  tableNumber?: number
  customerName?: string
  customerPhone?: string
  items: OrderItem[]
}

interface Settings {
  restaurantName: string
  restaurantAddress: string
  restaurantPhone: string
  restaurantTagline: string
  currencyLocale: string
  currencyCode: string
  taxLabel: string
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<'CASH' | 'ONLINE' | 'UNPAID' | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const resolvedParams = use(params)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${resolvedParams.id}`)
        if (res.ok) {
          const data = await res.json()
          setOrder(data)
        } else {
          toast.error('Order not found')
        }
      } catch (err) {
        console.error('Failed to load order', err)
        toast.error('Failed to load order')
      }
      setLoading(false)
    }
    fetchOrder()
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch(console.error)
  }, [resolvedParams.id, router])

  const fmtPrice = (amount: number) => {
    if (!settings) return `$${amount.toFixed(2)}`
    return formatPriceWithSettings(amount, settings.currencyLocale, settings.currencyCode)
  }

  const handleStatusUpdate = async (newStatus: string, paymentMethod?: string) => {
    try {
      const payload: Record<string, unknown> = { status: newStatus, paymentMethod }
      if (paymentMethod === 'UNPAID') {
        if (!customerName.trim()) {
          toast.error('Customer Name is required for unpaid bills')
          return
        }
        payload.customerName = customerName
        payload.customerPhone = customerPhone
      }

      const res = await fetch(`/api/orders/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const updated = await res.json()
        setOrder(updated)
        toast.success(`Order marked as ${newStatus}`)
        if (newStatus === 'PAID' || newStatus === 'UNPAID') {
          router.push('/')
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update order')
      }
    } catch (err) {
      console.error('Failed to update order', err)
      toast.error('Failed to update order')
    }
  }

  if (loading)
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-subtle)' }}>
        Loading order...
      </div>
    )

  if (!order)
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-subtle)' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</p>
        <p>Order not found</p>
      </div>
    )

  const subtotal = order.items.reduce((sum, item) => sum + item.priceAtOrder * item.quantity, 0)
  const taxAmount = order.total - subtotal

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6" style={{ gap: '1rem' }}>
        <button onClick={() => router.back()} className="btn btn-secondary">
          ← Back
        </button>
        <div className="flex gap-3">
          {order.status === 'PENDING' && (
            <button
              onClick={() => router.push(`/pos?table=${order.tableNumber}&orderId=${order.id}`)}
              className="btn btn-primary"
              style={{ background: 'var(--success)' }}
            >
              ➕ Add Items
            </button>
          )}
          {order.status !== 'CANCELLED' && (
            <button
              onClick={() => handleStatusUpdate('CANCELLED')}
              style={{
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s',
              }}
            >
              Cancel Order
            </button>
          )}
          <a href={`/orders/${order.id}/kot`} className="btn btn-secondary">
            🎫 Kitchen Token
          </a>
          <button onClick={() => window.print()} className="btn btn-primary">
            🖨️ Print Bill
          </button>
        </div>
      </div>

      <div className="receipt-card print-area">
        {/* Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--glass-border)',
          }}
        >
          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              background: 'var(--primary-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.35rem',
            }}
          >
            {settings?.restaurantName || 'Restaurant'}
          </h1>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>
            {settings?.restaurantAddress}
          </p>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.85rem' }}>
            Tel: {settings?.restaurantPhone}
          </p>
        </div>

        {/* Order Meta */}
        <div className="flex justify-between mb-6" style={{ fontSize: '0.9rem' }}>
          <div>
            <p
              style={{
                color: 'var(--foreground-muted)',
                fontSize: '0.8rem',
                marginBottom: '0.15rem',
              }}
            >
              Order #
            </p>
            <p style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{order.id}</p>
          </div>
          {order.tableNumber && (
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  color: 'var(--foreground-muted)',
                  fontSize: '0.8rem',
                  marginBottom: '0.15rem',
                }}
              >
                Table
              </p>
              <p style={{ fontWeight: 700 }}>{order.tableNumber}</p>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <p
              style={{
                color: 'var(--foreground-muted)',
                fontSize: '0.8rem',
                marginBottom: '0.15rem',
              }}
            >
              Date
            </p>
            <p style={{ fontWeight: 600 }}>
              {new Date(order.createdAt).toLocaleString(settings?.currencyLocale)}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', marginBottom: '1.5rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '0.7rem 0',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: 'var(--foreground-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Item
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '0.7rem 0',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: 'var(--foreground-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Qty
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '0.7rem 0',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: 'var(--foreground-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Price
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '0.7rem 0',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: 'var(--foreground-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.75rem 0', fontWeight: 500 }}>{item.menuItem.name}</td>
                <td style={{ textAlign: 'center', padding: '0.75rem 0' }}>{item.quantity}</td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '0.75rem 0',
                    color: 'var(--foreground-muted)',
                  }}
                >
                  {fmtPrice(item.priceAtOrder)}
                </td>
                <td style={{ textAlign: 'right', padding: '0.75rem 0', fontWeight: 600 }}>
                  {fmtPrice(item.priceAtOrder * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ borderTop: '2px solid var(--glass-border)', paddingTop: '1rem' }}>
          {taxAmount > 0 && (
            <>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>
                  Subtotal
                </span>
                <span style={{ fontWeight: 600 }}>{fmtPrice(subtotal)}</span>
              </div>
              <div
                className="flex justify-between items-center"
                style={{ marginBottom: '0.75rem' }}
              >
                <span style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>
                  {settings?.taxLabel || 'Tax'}
                </span>
                <span style={{ fontWeight: 600 }}>{fmtPrice(taxAmount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center">
            <div>
              <span
                className={`badge ${order.status === 'PAID' ? 'badge-success' : order.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}
              >
                {order.status}
              </span>
              {order.paymentMethod && (
                <span
                  className="badge"
                  style={{
                    marginLeft: '0.5rem',
                    background: 'var(--glass-bg)',
                    color: 'var(--foreground)',
                  }}
                >
                  {order.paymentMethod}
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  background: 'var(--primary-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {fmtPrice(order.total)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '2rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--glass-border)',
          }}
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>
            {settings?.restaurantTagline}
          </p>
        </div>
      </div>

      {/* Complete Order Section */}
      {order.status === 'PENDING' && (
        <div
          className="receipt-card print-area-hide"
          style={{ marginTop: '1.5rem', padding: '2rem', textAlign: 'center' }}
        >
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--foreground)' }}>Complete Order</h3>

          <div className="flex gap-4 justify-center" style={{ marginBottom: '2rem' }}>
            <button
              className={`btn ${selectedPayment === 'CASH' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedPayment('CASH')}
              style={{
                flex: 1,
                padding: '1.5rem 1rem',
                fontSize: '1.1rem',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>💵</span>
              Cash
            </button>
            <button
              className={`btn ${selectedPayment === 'ONLINE' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedPayment('ONLINE')}
              style={{
                flex: 1,
                padding: '1.5rem 1rem',
                fontSize: '1.1rem',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>💳</span>
              Online
            </button>
            <button
              className={`btn ${selectedPayment === 'UNPAID' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedPayment('UNPAID')}
              style={{
                flex: 1,
                padding: '1.5rem 1rem',
                fontSize: '1.1rem',
                borderRadius: 'var(--radius-lg)',
                background: selectedPayment === 'UNPAID' ? 'var(--warning-bg)' : undefined,
                color: selectedPayment === 'UNPAID' ? 'var(--warning-text)' : undefined,
                borderColor: selectedPayment === 'UNPAID' ? 'var(--warning)' : undefined,
              }}
            >
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📓</span>
              Unpaid Dues
            </button>
          </div>

          {selectedPayment === 'UNPAID' && (
            <div
              style={{
                marginBottom: '2rem',
                textAlign: 'left',
                background: 'rgba(255,255,255,0.03)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <h4 style={{ marginBottom: '1rem', color: 'var(--warning)' }}>
                Customer Details Required
              </h4>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    color: 'var(--foreground-muted)',
                  }}
                >
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="form-input"
                  placeholder="Enter full name"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    color: 'var(--foreground-muted)',
                  }}
                >
                  Customer Phone
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="form-input"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          )}

          <button
            className="checkout-btn"
            disabled={!selectedPayment}
            onClick={() =>
              handleStatusUpdate(
                selectedPayment === 'UNPAID' ? 'UNPAID' : 'PAID',
                selectedPayment || undefined
              )
            }
            style={{
              background: selectedPayment === 'UNPAID' ? 'var(--warning)' : undefined,
              boxShadow:
                selectedPayment === 'UNPAID' ? '0 8px 30px rgba(245, 158, 11, 0.4)' : undefined,
            }}
          >
            ✓ {selectedPayment === 'UNPAID' ? 'Save as Unpaid' : 'Settle Bill & Complete'} (
            {fmtPrice(order.total)})
          </button>
        </div>
      )}
    </div>
  )
}
