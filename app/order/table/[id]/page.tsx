import { getTables } from '@/lib/db/tables'
import { getOrder } from '@/lib/db/orders'
import { getSettingsCompat } from '@/lib/settings'
import { fmtPrice } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'

export default async function CustomerTableOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const tableIdStr = resolvedParams.id
  const tableNumber = parseInt(tableIdStr)
  
  const tables = await getTables()
  const table = tables.find(t => t.number === tableNumber)
  
  const settings = await getSettingsCompat()

  if (!table || !table.order) {
    return (
      <div className="max-width-lg mx-auto p-4 text-center">
        <PageHeader title={`Table ${tableNumber}`} />
        <div className="card" style={{ padding: '3rem', marginTop: '2rem' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</p>
          <h2 style={{ marginBottom: '0.5rem' }}>No Active Order</h2>
          <p style={{ color: 'var(--foreground-muted)', lineHeight: 1.5 }}>
            Please place an order with the waiter. Once your order is placed, refresh this page or scan the QR code again to view your bill.
          </p>
          <div style={{ marginTop: '2rem' }}>
             <a href={`/order/table/${tableNumber}`} className="btn btn-primary" style={{ display: 'inline-block' }}>
               🔄 Refresh Status
             </a>
          </div>
        </div>
      </div>
    )
  }

  const order = await getOrder(table.order.id)
  if (!order) {
    return (
      <div className="max-width-lg mx-auto p-4 text-center">
        <PageHeader title={`Table ${tableNumber}`} />
        <div className="card" style={{ padding: '3rem', marginTop: '2rem' }}>
           <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</p>
           <h2 style={{ marginBottom: '0.5rem' }}>Order Error</h2>
           <p style={{ color: 'var(--foreground-muted)' }}>Could not load order details.</p>
        </div>
      </div>
    )
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const taxAmount = order.total - subtotal

  return (
    <div className="max-width-lg mx-auto p-4" style={{ paddingBottom: '4rem' }}>
      <PageHeader title={`Table ${tableNumber} Bill`} description={`Order #${order.id}`} />
      
      <div className="receipt-card" style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem', marginBottom: '1rem', color: 'var(--primary-light)' }}>
           Order Items
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {order.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{item.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>Qty: {item.quantity} × {fmtPrice(item.price, { currencyLocale: settings.currency.locale, currencyCode: settings.currency.code, currencySymbol: settings.currency.symbol })}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>
                {fmtPrice(item.price * item.quantity, { currencyLocale: settings.currency.locale, currencyCode: settings.currency.code, currencySymbol: settings.currency.symbol })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', color: 'var(--foreground-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Subtotal</span>
            <span>{fmtPrice(subtotal, { currencyLocale: settings.currency.locale, currencyCode: settings.currency.code, currencySymbol: settings.currency.symbol })}</span>
          </div>
          {taxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Tax</span>
              <span>{fmtPrice(taxAmount, { currencyLocale: settings.currency.locale, currencyCode: settings.currency.code, currencySymbol: settings.currency.symbol })}</span>
            </div>
          )}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '1.25rem', 
            fontWeight: 800, 
            marginTop: '0.75rem', 
            paddingTop: '0.75rem', 
            borderTop: '1px dashed var(--glass-border)',
            color: 'var(--foreground)'
          }}>
            <span>Grand Total</span>
            <span style={{ color: 'var(--primary-light)' }}>{fmtPrice(order.total, { currencyLocale: settings.currency.locale, currencyCode: settings.currency.code, currencySymbol: settings.currency.symbol })}</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', gap: '0.5rem', background: 'rgba(255,106,0,0.1)', color: 'var(--primary-light)', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid rgba(255,106,0,0.2)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-light)', animation: 'pulse 2s infinite' }}></div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Status: {order.status}</span>
        </div>
        
        <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
          Please complete payment at the counter.
        </p>

        <a href={`/order/table/${tableNumber}`} className="btn btn-secondary" style={{ display: 'inline-block', margin: '0 auto' }}>
           🔄 Refresh Status
        </a>
      </div>
    </div>
  )
}
