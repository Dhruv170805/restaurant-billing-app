'use client'

import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { fmtPrice as formatPrice } from '@/lib/format'
import { useTables, useSettings } from '@/hooks/useData'

import type { TableInfo } from '@/lib/db'

export default function Home() {
  const router = useRouter()
  const { tables, isLoading: tablesLoading } = useTables()
  const { settings } = useSettings()

  const fmtPrice = (amount: number) => formatPrice(amount, settings)

  const handleTableClick = (table: TableInfo) => {
    if (table.status === 'occupied' && table.order) {
      router.push(`/orders/${table.order.id}`)
    } else {
      router.push(`/pos?table=${table.number}`)
    }
  }

  const occupiedCount = tables.filter((t) => t.status === 'occupied').length
  const availableCount = tables.filter((t) => t.status === 'available').length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tables"
        description="Tap an available table to start an order"
        action={
          <div className="flex gap-4 items-center">
            <div className="flex gap-3 items-center" style={{ fontSize: '0.85rem' }}>
              <span className="flex items-center gap-2">
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--success)',
                    display: 'inline-block',
                    boxShadow: '0 0 8px var(--success-glow)',
                  }}
                ></span>
                <span style={{ color: 'var(--foreground-muted)' }}>{availableCount} Available</span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: 'var(--danger)',
                    display: 'inline-block',
                    boxShadow: '0 0 8px rgba(248,113,113,0.4)',
                  }}
                ></span>
                <span style={{ color: 'var(--foreground-muted)' }}>{occupiedCount} Occupied</span>
              </span>
            </div>
          </div>
        }
      />

      {tablesLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--foreground-subtle)' }}>
          <p style={{ fontSize: '1.1rem' }}>Loading tables...</p>
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {tables.map((table) => (
            <div
              key={table.number}
              className={`table-card ${table.status}`}
              onClick={() => handleTableClick(table)}
            >
              <div className="table-card-header">
                <span className="table-card-number">{table.number}</span>
                <StatusBadge status={table.status} className="table-card-badge" />
              </div>

              {table.status === 'occupied' && table.order ? (
                <div className="table-card-details">
                  <div
                    className="flex justify-between items-center"
                    style={{ marginBottom: '0.35rem' }}
                  >
                    <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                      Token #{table.order.tokenNumber}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                      {table.order.itemCount} items
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--foreground)',
                    }}
                  >
                    {fmtPrice(table.order.total)}
                  </p>
                </div>
              ) : (
                <div className="table-card-details">
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--foreground-subtle)',
                      textAlign: 'center',
                    }}
                  >
                    Tap to start order
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
