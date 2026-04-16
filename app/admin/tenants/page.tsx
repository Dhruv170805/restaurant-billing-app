'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Tenant {
  id: string
  slug: string
  name: string
  plan: string
  suspended: boolean
  created_at: string
  logo_url?: string
}

export default function AdminTenantsPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/tenants', {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('access_token')}` },
    })
      .then(r => {
        if (r.status === 401 || r.status === 403) { router.push('/login'); return null }
        return r.json()
      })
      .then(d => { if (d) setTenants(d.tenants ?? []) })
      .catch(() => setError('Failed to load tenants'))
      .finally(() => setLoading(false))
  }, [router])

  async function toggleSuspend(slug: string, suspended: boolean) {
    await fetch(`/api/admin/tenants/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('access_token')}` },
      body: JSON.stringify({ action: suspended ? 'reactivate' : 'suspend' }),
    })
    setTenants(prev => prev.map(t => t.slug === slug ? { ...t, suspended: !suspended } : t))
  }

  const planColor: Record<string, string> = { free: '#6b7280', starter: '#3b82f6', pro: '#f37c22' }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, background: 'linear-gradient(135deg,#f37c22,#e8521a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Tenants
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{tenants.length} restaurants</p>
        </div>
        <Link href="/admin/tenants/new" style={{
          padding: '0.6rem 1.2rem', borderRadius: '10px', background: 'linear-gradient(135deg,#f37c22,#e8521a)',
          color: 'white', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem',
        }}>
          + New Tenant
        </Link>
      </div>

      {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tenants.map(t => (
            <div key={t.slug} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1rem 1.25rem', borderRadius: '14px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${t.suspended ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
              transition: 'all 0.2s',
            }}>
              {/* Logo / Avatar */}
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,#f37c22,#e8521a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, color: 'white', fontSize: '1.1rem',
              }}>
                {t.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/{t.slug} &bull; {new Date(t.created_at).toLocaleDateString()}</div>
              </div>

              {/* Plan badge */}
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                background: `${planColor[t.plan]}22`, color: planColor[t.plan], border: `1px solid ${planColor[t.plan]}44`,
              }}>
                {t.plan.toUpperCase()}
              </span>

              {/* Status */}
              {t.suspended && (
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  SUSPENDED
                </span>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => toggleSuspend(t.slug, t.suspended)}
                  style={{
                    padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                    background: t.suspended ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: t.suspended ? '#4ade80' : '#f87171',
                  }}
                >
                  {t.suspended ? 'Reactivate' : 'Suspend'}
                </button>
                <Link href={`/admin/tenants/${t.slug}`} style={{
                  padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.07)',
                  color: 'var(--text)', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600,
                }}>
                  Manage →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
