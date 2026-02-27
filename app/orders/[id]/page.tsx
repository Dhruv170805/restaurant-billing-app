'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { fmtPrice as formatPrice } from '@/lib/format'

import type { AppSettings, Order } from '@/lib/db'
import type { DbOrderItem } from '@/lib/db/schema'

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<'CASH' | 'ONLINE' | 'UNPAID' | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customers, setCustomers] = useState<{ name: string, phone: string }[]>([])

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

    fetch('/api/customers')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCustomers(data)
      })
      .catch(console.error)
  }, [resolvedParams.id, router])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setCustomerName(newName)

    // Auto-complete phone if exact match found
    const match = customers.find(c => c.name.toLowerCase() === newName.toLowerCase())
    if (match && !customerPhone) {
      setCustomerPhone(match.phone)
    }
  }

  const fmtPrice = (amount: number) => formatPrice(amount, settings)

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

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const taxAmount = order.total - subtotal

  return (
    <div className="max-width-lg mx-auto p-4">
      {/* Print Styles - 80mm thermal receipt */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { margin: 0; size: 80mm auto; }
          body { background: white !important; color: black !important; }
          .print-area-hide { display: none !important; }
          .receipt-card {
            width: 300px !important;
            max-width: 300px !important;
            margin: 0 auto !important;
            padding: 8px !important;
            background: white !important;
            border: none !important;
            box-shadow: none !important;
          }
          * { color: black !important; background: transparent !important;
              text-shadow: none !important; -webkit-text-fill-color: black !important; }
          .status-badge { display: none !important; }
        }
      `}} />
      <div className="flex flex-wrap justify-between items-center mb-6 order-actions" style={{ gap: '1rem' }}>
        <button onClick={() => router.back()} className="btn btn-secondary order-actions-btn">
          ← Back
        </button>
        <div className="flex flex-wrap justify-center gap-3 order-actions-group">
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
        </div>
      </div>

      <div className="receipt-card print-area">

        {/* === LOGO HEADER === */}
        <div style={{ textAlign: 'center', paddingBottom: '0.5rem', borderBottom: '2px solid #000', marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', marginTop: '0.3rem' }}>
            {settings?.restaurantName || 'Restaurant'}
          </div>
          {settings?.restaurantAddress && (
            <div style={{ fontSize: '0.72rem', marginTop: '0.1rem' }}>{settings.restaurantAddress}</div>
          )}
          {settings?.restaurantPhone && (
            <div style={{ fontSize: '0.72rem' }}>Ph: {settings.restaurantPhone}</div>
          )}
        </div>

        {/* === ORDER META === */}
        <div style={{ fontSize: '0.78rem', marginBottom: '0.5rem', lineHeight: '1.7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Name: {customerName || order.customerName || '_______________'}</span>
            <span>Mob: {customerPhone || order.customerPhone || '_______________'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingBottom: '0.3rem' }}>
            <span>
              Date: {new Date(order.createdAt).toLocaleDateString(settings?.currencyLocale || 'en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: settings?.timezone || 'Asia/Kolkata' })}{' '}
              {new Date(order.createdAt).toLocaleTimeString(settings?.currencyLocale || 'en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: settings?.timezone || 'Asia/Kolkata' })}
            </span>
            <span><strong>Dine In: {order.tableNumber ? `A${order.tableNumber}` : 'T/A'}</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span>Bill No.: {order.id}</span>
          </div>
        </div>

        {/* === ITEMS TABLE === */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
          <thead>
            <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ textAlign: 'left', padding: '2px 2px', fontWeight: 700 }}>Item</th>
              <th style={{ textAlign: 'center', padding: '2px 2px', fontWeight: 700, width: '30px' }}>Qty.</th>
              <th style={{ textAlign: 'right', padding: '2px 2px', fontWeight: 700, width: '55px' }}>Price</th>
              <th style={{ textAlign: 'right', padding: '2px 2px', fontWeight: 700, width: '55px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item: DbOrderItem, idx: number) => (
              <tr key={idx} style={{ borderBottom: '1px dotted #ccc' }}>
                <td style={{ padding: '3px 2px' }}>{item.name}</td>
                <td style={{ textAlign: 'center', padding: '3px 2px' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right', padding: '3px 2px' }}>{item.price.toFixed(2)}</td>
                <td style={{ textAlign: 'right', padding: '3px 2px', fontWeight: 600 }}>{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* === TOTALS === */}
        <div style={{ borderTop: '1px solid #000', paddingTop: '0.3rem', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
            <span>Total Qty: {order.items.reduce((s, i) => s + i.quantity, 0)}</span>
            <span>Sub Total: {fmtPrice(subtotal)}</span>
          </div>
          {taxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.2rem' }}>
              <span>{settings?.taxLabel || 'Tax'}: {fmtPrice(taxAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #000', paddingTop: '0.3rem', fontWeight: 800, fontSize: '0.95rem' }}>
            <span>Grand Total: {fmtPrice(order.total)}</span>
          </div>
        </div>

        {/* === FOOTER === */}
        <div style={{ textAlign: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed #000', fontSize: '0.8rem' }}>
          <p style={{ fontWeight: 700 }}>{settings?.restaurantTagline || 'Thanks!'}</p>
        </div>

        {/* Status badge - hidden on print */}
        <div className="status-badge print-area-hide" style={{ textAlign: 'center', marginTop: '1rem' }}>
          <span className={`badge ${order.status === 'PAID' ? 'badge-success' : order.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>
            {order.status}
          </span>
          {order.paymentMethod && order.paymentMethod !== 'UNPAID' && (
            <span className="badge" style={{ marginLeft: '0.5rem' }}>{order.paymentMethod}</span>
          )}
        </div>
      </div>

      {/* Complete Order Section - Strict 3-Step Flow */}
      {order.status === 'PENDING' && (
        <div
          className="receipt-card print-area-hide"
          style={{ marginTop: '1.5rem', padding: '2rem', textAlign: 'left' }}
        >
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--foreground)', textAlign: 'center' }}>Complete Order</h3>

          {/* STEP 1: Customer Details */}
          <div style={{
            marginBottom: '2rem',
            background: 'rgba(255,255,255,0.03)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
          }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: 'var(--primary)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>1</span>
              Customer Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={handleNameChange}
                  list="customer-list"
                  className="form-input"
                  placeholder="Enter full name"
                  autoFocus
                  required
                />
                <datalist id="customer-list">
                  {customers.map((c, i) => (
                    <option key={i} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>
                  Customer Phone *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="form-input"
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>
          </div>

          {/* STEP 2: Print Bill */}
          <div style={{
            marginBottom: '2rem',
            background: 'rgba(255,255,255,0.03)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
            opacity: !customerName.trim() ? 0.5 : 1,
            pointerEvents: !customerName.trim() ? 'none' : 'auto',
            transition: 'all 0.3s'
          }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: 'var(--primary)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>2</span>
              Print Final Bill
            </h4>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => window.print()} className="btn btn-primary" style={{ flex: 1, padding: '1rem', fontSize: '1.1rem' }}>
                🖨️ Print Customer Bill
              </button>
            </div>
            <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--foreground-muted)', textAlign: 'center' }}>
              Hand the printed bill to the customer before collecting payment.
            </p>
          </div>

          {/* STEP 3: Payment & Settle */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
            opacity: !customerName.trim() ? 0.5 : 1,
            pointerEvents: !customerName.trim() ? 'none' : 'auto',
            transition: 'all 0.3s'
          }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: 'var(--primary)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>3</span>
              Receive Payment & Settle
            </h4>

            <div className="flex gap-4 justify-center payment-methods-mobile" style={{ marginBottom: '1.5rem' }}>
              <button
                className={`btn ${selectedPayment === 'CASH' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedPayment('CASH')}
                style={{ flex: 1, padding: '1.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}
              >
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>💵</span>
                Cash
              </button>
              <button
                className={`btn ${selectedPayment === 'ONLINE' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedPayment('ONLINE')}
                style={{ flex: 1, padding: '1.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}
              >
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>💳</span>
                Online
              </button>
              <button
                className={`btn ${selectedPayment === 'UNPAID' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedPayment('UNPAID')}
                style={{
                  flex: 1, padding: '1.25rem 0.5rem', borderRadius: 'var(--radius-md)',
                  background: selectedPayment === 'UNPAID' ? 'var(--warning-bg)' : undefined,
                  color: selectedPayment === 'UNPAID' ? 'var(--warning-text)' : undefined,
                  borderColor: selectedPayment === 'UNPAID' ? 'var(--warning)' : undefined,
                }}
              >
                <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>📓</span>
                Unpaid
              </button>
            </div>

            <button
              className="checkout-btn"
              disabled={!selectedPayment || !customerName.trim() || !customerPhone.trim()}
              onClick={() => handleStatusUpdate(selectedPayment === 'UNPAID' ? 'UNPAID' : 'PAID', selectedPayment || undefined)}
              style={{
                width: '100%',
                background: selectedPayment === 'UNPAID' ? 'var(--warning)' : undefined,
                boxShadow: selectedPayment === 'UNPAID' ? '0 8px 30px rgba(245, 158, 11, 0.4)' : undefined,
              }}
            >
              ✓ {selectedPayment === 'UNPAID' ? 'Save as Unpaid Dues' : 'Settle Bill & Complete'} ({fmtPrice(order.total)})
            </button>
            {!customerPhone.trim() && (
              <p style={{ color: 'var(--warning)', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem' }}>
                Customer phone number is strictly required to complete the order.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
