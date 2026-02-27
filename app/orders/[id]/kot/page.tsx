'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

import type { Order } from '@/lib/db'
import type { DbSettings, DbOrderItem } from '@/lib/db/schema'

export default function KitchenTokenPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<DbSettings | null>(null)

  const resolvedParams = use(params)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${resolvedParams.id}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setOrder(data)
        }
      } catch (err) {
        console.error('Failed to load order', err)
      }
      setLoading(false)
    }
    fetchOrder()
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch(console.error)

    const handleAfterPrint = () => {
      router.push('/')
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [resolvedParams.id, router])

  const handlePrint = async () => {
    try {
      await fetch(`/api/orders/${resolvedParams.id}/kot`, { method: 'PUT' })
    } catch (err) {
      console.error('Failed to mark KOT as printed', err)
    }
    window.print()
  }

  if (loading)
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-subtle)' }}>
        Loading...
      </div>
    )

  if (!order)
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-subtle)' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</p>
        <p>Order not found</p>
      </div>
    )

  const locale = settings?.currencyLocale || 'en-US'
  const tz = settings?.timezone || 'Asia/Kolkata'
  const orderDate = new Date(order.createdAt)
  const timeStr = orderDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
    hour12: true,
  })
  const dateStr = orderDate.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: tz,
  })

  return (
    <div className="max-w-2xl mx-auto">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { margin: 0; }
          body { 
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          .kot-card {
            width: 300px !important;
            max-width: 300px !important;
            margin: 0 auto !important;
            padding: 10px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .print-hidden {
            display: none !important;
          }
          /* Override any glassmorphism / dark mode colors for thermal printer */
          * {
            color: black !important;
            text-shadow: none !important;
          }
        }
      `}} />

      <div className="flex justify-between items-center mb-6 print-hidden">
        <button onClick={() => router.back()} className="btn btn-secondary">
          ← Back
        </button>
        <button onClick={handlePrint} className="btn btn-primary">
          🖨️ Print KOT
        </button>
      </div>

      <div className="kot-card print-area" style={{ maxWidth: '300px', margin: '0 auto', background: 'var(--card-bg)' }}>
        {/* KOT Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '1rem',
            paddingBottom: '1rem',
            borderBottom: '1px dashed #000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Print-optimized text logo (Black & White for Thermal) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: 1,
            marginBottom: '0.5rem'
          }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#000', letterSpacing: '-0.5px' }}>
              {settings?.restaurantName || 'Restaurant'}
            </span>
          </div>
          <p
            style={{
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}
          >
            Kitchen Ticket
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>
            #{order.tokenNumber ?? order.id}
          </p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>
            {settings?.restaurantName || 'Restaurant'}
          </p>
        </div>

        {/* Time & Order Info */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            padding: '0.75rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div>
            <span style={{ color: 'var(--foreground-muted)' }}>Order </span>
            <span style={{ fontWeight: 700, color: 'var(--primary-light)' }}>#{order.id}</span>
          </div>
          {order.tableNumber && (
            <div>
              <span style={{ fontWeight: 800, fontSize: '1rem' }}>Table {order.tableNumber}</span>
            </div>
          )}
          <div>
            <span style={{ color: 'var(--foreground-muted)' }}>{dateStr} </span>
            <span style={{ fontWeight: 700 }}>{timeStr}</span>
          </div>
        </div>

        {/* Items List */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px dashed #000' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px dashed #000' }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.6rem 0',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Item
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    padding: '0.6rem 0',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    width: '60px',
                  }}
                >
                  Qty
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items
                .map((item: DbOrderItem, index: number) => {
                  const qty = Number(item.quantity) || 1
                  const printedQty = Number(item.printedQuantity) || 0
                  const unprintedQty = qty - printedQty

                  return { ...item, unprintedQty, index }
                })
                .filter(item => item.unprintedQty > 0)
                .map((item) => {
                  const menuItemIdStr = String(item.menuItemId || `fallback-item-${item.index}`)
                  const nameStr = item.name || 'Unknown Item'

                  return (
                    <tr key={menuItemIdStr}>
                      <td
                        style={{
                          padding: '0.5rem 0',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          borderBottom: '1px dotted #ccc',
                        }}
                      >
                        {nameStr}
                      </td>
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '0.5rem 0',
                          fontWeight: 800,
                          fontSize: '1rem',
                          borderBottom: '1px dotted #ccc',
                        }}
                      >
                        ×{item.unprintedQty}
                      </td>
                    </tr>
                  )
                })}

              {order.items.filter((item: DbOrderItem) => (item.quantity - (item.printedQuantity || 0)) > 0).length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '1rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>
                    No new items to print.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            paddingTop: '1rem',
          }}
        >
          <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            {order.items.reduce((sum, i) => sum + (i.quantity - (i.printedQuantity || 0)), 0)} new items total
          </p>
          {order.customerName && (
            <p style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: '0.5rem' }}>
              Customer: {order.customerName}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
