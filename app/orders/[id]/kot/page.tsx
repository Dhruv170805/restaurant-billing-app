'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import type { Order } from '@/lib/db'
import type { DbSettings } from '@/lib/db/schema'

export default function KitchenTokenPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<DbSettings | null>(null)

  const resolvedParams = use(params)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${resolvedParams.id}`)
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

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

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
  const orderDate = new Date(order.createdAt)
  const timeStr = orderDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  const dateStr = orderDate.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6" data-print-hidden>
        <button onClick={() => router.back()} className="btn btn-secondary">
          ← Back
        </button>
        <button onClick={handlePrint} className="btn btn-primary">
          🖨️ Print KOT
        </button>
      </div>

      <div className="kot-card print-area">
        {/* KOT Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '2px dashed var(--glass-border)',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--foreground-muted)',
              marginBottom: '0.5rem',
              fontWeight: 600,
            }}
          >
            Kitchen Order Ticket
          </p>
          <p
            style={{
              fontSize: '3.5rem',
              fontWeight: 900,
              lineHeight: 1,
              background: 'var(--primary-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            #{order.tokenNumber ?? order.id}
          </p>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--foreground-muted)',
              marginTop: '0.5rem',
              fontWeight: 500,
            }}
          >
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
        <div style={{ marginBottom: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.6rem 0',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--foreground-muted)',
                  }}
                >
                  Item
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    padding: '0.6rem 0',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--foreground-muted)',
                    width: '80px',
                  }}
                >
                  Qty
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: Record<string, unknown>, index: number) => {
                const menuItemIdStr = String(item.menuItemId || item.id || `fallback-item-${index}`)
                const nameStr = String(
                  item.name ||
                  ((item.menuItem as Record<string, unknown>)?.name) ||
                  'Unknown Item'
                )
                const qtyStr = String(item.quantity || 1)

                return (
                  <tr
                    key={menuItemIdStr}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td
                      style={{
                        padding: '0.85rem 0',
                        fontWeight: 600,
                        fontSize: '1.05rem',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {nameStr}
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: '0.85rem 0',
                        fontWeight: 800,
                        fontSize: '1.15rem',
                        color: 'var(--primary-light)',
                      }}
                    >
                      ×{qtyStr}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            paddingTop: '1rem',
            borderTop: '2px dashed var(--glass-border)',
          }}
        >
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--foreground-muted)',
              fontWeight: 500,
            }}
          >
            {order.items.reduce((sum, i) => sum + i.quantity, 0)} items total
          </p>
        </div>
      </div>
    </div>
  )
}
