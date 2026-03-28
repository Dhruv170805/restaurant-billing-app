'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { toast } from 'sonner'
import { useTables, useSettings, useMenu, useCategories } from '@/hooks/useData'
import { POSSkeleton } from '@/components/ui/Skeletons'

import { fmtPrice as formatPrice } from '@/lib/format'
import { calculateTaxWithSettings } from '@/lib/pricing'
import type { MenuItem } from '@/lib/db'

interface CartItem extends MenuItem {
  quantity: number
}

function POSContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tableNumber = searchParams.get('table') ? parseInt(searchParams.get('table')!) : null
  const orderId = searchParams.get('orderId') ? parseInt(searchParams.get('orderId')!) : null

  const { items: menuItems, isLoading: menuLoading } = useMenu()
  const { categories: rawCategories, isLoading: catsLoading } = useCategories()
  const { settings, isLoading: settingsLoading } = useSettings()

  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [checkingOut, setCheckingOut] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const categories = ['All', ...rawCategories.map(c => c.name)]

  const fmtPrice = (amount: number) => formatPrice(amount, settings)

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    toast.success(`Added ${item.name}`)
  }

  const removeFromCart = (itemId: number) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId))
  }

  const updateQuantity = (itemId: number, delta: number) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.id === itemId) {
          const newQty = item.quantity + delta
          return newQty > 0 ? { ...item, quantity: newQty } : item
        }
        return item
      })
    })
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const { tax, total } = settings
    ? calculateTaxWithSettings(subtotal, settings.taxEnabled, settings.taxRate)
    : { tax: 0, total: subtotal }

  const handleCheckout = async () => {
    if (cart.length === 0 || checkingOut || !tableNumber) return
    setCheckingOut(true)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          total,
          tableNumber,
          orderId,
        }),
      })

      if (res.ok) {
        const order = await res.json()
        toast.success(
          orderId ? `Items added to Order #${orderId}!` : `Order placed for Table ${tableNumber}!`
        )
        router.push(`/orders/${order.id}`)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Checkout failed')
      }
    } catch (error) {
      console.error('Checkout failed', error)
      toast.error('Checkout failed. Please try again.')
    } finally {
      setCheckingOut(false)
    }
  }

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category.name === selectedCategory
    const matchesSearch =
      !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  if (menuLoading || settingsLoading) return <POSSkeleton />

  if (!tableNumber) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</p>
        <h2 style={{ marginBottom: '0.5rem' }}>No Table Selected</h2>
        <p style={{ color: 'var(--foreground-muted)', marginBottom: '1.5rem' }}>
          Please select a table from the dashboard to start an order.
        </p>
        <button onClick={() => router.push('/')} className="btn btn-primary">
          ← Go to Tables
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-6 pos-layout" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Left Side - Menu */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden pos-menu">
        <div className="flex gap-3 items-center shrink-0">
          <div style={{ position: 'relative', flex: '0 0 240px' }}>
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
            <input type="text" className="form-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search POS..." style={{ paddingLeft: '2.25rem', height: '2.5rem', fontSize: '0.85rem' }} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ flex: 1 }}>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="grid overflow-y-auto pr-2 pb-4 min-h-0" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.65rem', alignContent: 'start' }}>
          {filteredItems.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--foreground-subtle)', fontSize: '1.1rem' }}>{searchQuery ? 'No items match your search.' : 'No items found.'}</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const inCart = cart.find((c) => c.id === item.id)
              return (
                <div key={item.id} onClick={() => addToCart(item)} style={{ position: 'relative', background: inCart ? 'rgba(var(--primary-rgb, 99,102,241), 0.08)' : 'rgba(255,255,255,0.03)', border: inCart ? '1px solid rgba(var(--primary-rgb, 99,102,241), 0.25)' : '1px solid var(--glass-border)', borderRadius: '14px', padding: '0.9rem 1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.35rem', transition: 'all 0.2s ease', overflow: 'hidden', minHeight: '110px', justifyContent: 'space-between' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, var(--primary), var(--primary-light))', opacity: inCart ? 1 : 0.4 }} />
                  {inCart && <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'var(--primary)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, width: '1.4rem', height: '1.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inCart.quantity}</span>}
                  <div style={{ paddingRight: inCart ? '1.8rem' : '0' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--foreground)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                  </div>
                  <p style={{ color: 'var(--primary-light)', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'monospace', marginTop: 'auto' }}>{fmtPrice(item.price)}</p>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right Side - Cart */}
      <div className="card flex flex-col pos-cart" style={{ width: '380px', height: '100%' }}>
        <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <div className="flex justify-between items-center">
            <h2>🛒 {orderId ? 'Add Items' : 'Current Order'}</h2>
            <span className="badge badge-warning" style={{ fontSize: '0.85rem', fontWeight: 700 }}>Table {tableNumber} {orderId ? `(#${orderId})` : ''}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-3">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--foreground-subtle)' }}>
              <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍽️</p>
              <p>Tap a menu item to add it</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} style={{ background: 'var(--glass-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>{fmtPrice(item.price)} × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '0.15rem' }}>
                    <button className="w-8 h-8 flex items-center justify-center rounded" onClick={() => updateQuantity(item.id, -1)}>−</button>
                    <span style={{ fontSize: '0.85rem', width: '1.2rem', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                    <button className="w-8 h-8 flex items-center justify-center rounded" onClick={() => updateQuantity(item.id, 1)}>+</button>
                  </div>
                  <button style={{ color: 'var(--danger)', fontSize: '1.2rem' }} onClick={() => removeFromCart(item.id)}>×</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1rem', marginTop: '1rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>Total</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-light)' }}>{fmtPrice(total)}</span>
          </div>
          <button className="checkout-btn" onClick={handleCheckout} disabled={cart.length === 0 || checkingOut}>
            {checkingOut ? 'Processing...' : orderId ? `Add to Order #${orderId}` : `Place Order — Table ${tableNumber}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function POSPage() {
  return (
    <Suspense fallback={<POSSkeleton />}>
      <POSContent />
    </Suspense>
  )
}
