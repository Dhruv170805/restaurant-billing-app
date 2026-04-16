import { notFound } from 'next/navigation'
import { getOrder } from '@/lib/db/orders'
import { getTenantById } from '@/lib/db/tenants'
import { fmtPrice as formatPrice } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function PublicBillPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const orderId = Number(resolvedParams.id)

  if (isNaN(orderId)) return notFound()

  // 1. Fetch Order securely via server bypass
  const order = await getOrder(orderId)
  if (!order) return notFound()

  // 2. Fetch the Tenant to inject precise settings
  const tenant = await getTenantById(order.tenantId || 'default')
  if (!tenant) return notFound()

  const config = tenant.config
  const fmtPrice = (amount: number) => formatPrice(amount, config as any)

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const taxAmount = order.total - subtotal

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'rgba(10, 10, 15, 0.95)',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    }}>
      <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary: ${tenant.theme?.primary || '#f37c22'};
              --primary-light: ${tenant.theme?.primary ? tenant.theme.primary + 'cc' : '#f89a54'};
            }
            body { margin: 0; background: #000; }
          `
      }} />

      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Top Gradient Accents */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: '4px',
          background: 'linear-gradient(90deg, var(--primary), var(--primary-light))'
        }} />

        {/* LOGO HEADER */}
        <div style={{ textAlign: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt="Logo" style={{ height: '64px', width: '64px', objectFit: 'contain', margin: '0 auto 1rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} />
          ) : (
             <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏢</div>
          )}
          <div style={{ fontWeight: 900, fontSize: '1.5rem', color: '#fff', letterSpacing: '-0.02em' }}>
            {tenant.name}
          </div>
          {tenant.config && (
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
              Receipt for Order #{order.id}
            </div>
          )}
        </div>

        {/* ORDER META */}
        <div style={{ fontSize: '0.85rem', marginBottom: '1.5rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date</span>
            <span style={{ color: '#fff' }}>
              {new Date(order.createdAt).toLocaleDateString(config?.currencyLocale || 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Time</span>
            <span style={{ color: '#fff' }}>
              {new Date(order.createdAt).toLocaleTimeString(config?.currencyLocale || 'en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {order.customerName && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Customer</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{order.customerName}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Dine In</span>
            <span style={{ color: '#fff' }}>{order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}</span>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div style={{ marginBottom: '1.5rem' }}>
          {order.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', fontSize: '0.9rem' }}>
              <div style={{ color: '#fff', flex: 1 }}>
                {item.quantity}x <span style={{ marginLeft: '0.25rem' }}>{item.name}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                {fmtPrice(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>

        {/* TOTALS */}
        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Sub-total</span>
            <span>{fmtPrice(subtotal)}</span>
          </div>
          {taxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span>{config?.taxLabel || 'Tax'}</span>
              <span>{fmtPrice(taxAmount)}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.2)', fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)' }}>
            <span>Total</span>
            <span>{fmtPrice(order.total)}</span>
          </div>
        </div>

        {/* STATUS BAR */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          textAlign: 'center',
          borderRadius: '12px',
          background: order.status === 'PAID' ? 'rgba(34,197,94,0.1)' : order.status === 'UNPAID' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
          color: order.status === 'PAID' ? '#22c55e' : order.status === 'UNPAID' ? '#f87171' : 'rgba(255,255,255,0.7)',
          fontWeight: 800,
          letterSpacing: '0.05em',
        }}>
          {order.status === 'PAID' ? '✓ PAID IN FULL' : order.status === 'UNPAID' ? '⚠️ PAYMENT DUE' : '⏳ PENDING'}
        </div>
      </div>
    </div>
  )
}
