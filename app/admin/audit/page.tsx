'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AuditLog {
  _id: string
  type: string
  actorEmail: string
  tenantId: string
  targetId?: string
  ip?: string
  createdAt: string
}

const TYPE_COLOR: Record<string, string> = {
  LOGIN: '#4ade80',
  LOGOUT: '#6b7280',
  LOGIN_FAILED: '#f87171',
  IMPERSONATE: '#f59e0b',
  PLAN_CHANGE: '#3b82f6',
  USER_CREATED: '#a78bfa',
  TENANT_SUSPENDED: '#ef4444',
  TENANT_REACTIVATED: '#22c55e',
  TENANT_CREATED: '#f37c22',
  ORDER_DELETED: '#f87171',
  SETTINGS_CHANGED: '#60a5fa',
  PASSWORD_RESET: '#f59e0b',
}

export default function AdminAuditPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantFilter, setTenantFilter] = useState('')

  useEffect(() => {
    const url = tenantFilter ? `/api/admin/audit?tenantId=${tenantFilter}` : '/api/admin/audit'
    fetch(url, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem('access_token')}` },
    })
      .then(r => { if (r.status === 403) { router.push('/login'); return null } return r.json() })
      .then(d => { if (d) setLogs(d.logs ?? []) })
      .finally(() => setLoading(false))
  }, [tenantFilter, router])

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>Audit Log</h1>
        <input
          placeholder="Filter by tenant slug…"
          value={tenantFilter}
          onChange={e => setTenantFilter(e.target.value)}
          style={{
            padding: '0.5rem 1rem', borderRadius: 10, background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', outline: 'none', width: 220,
          }}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {logs.map(log => (
            <div key={log._id} style={{
              display: 'grid', gridTemplateColumns: '140px 1fr 140px 160px 140px',
              gap: '1rem', alignItems: 'center',
              padding: '0.75rem 1.25rem', borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.8rem',
            }}>
              <span style={{
                fontWeight: 700, padding: '2px 8px', borderRadius: 6, textAlign: 'center',
                background: `${TYPE_COLOR[log.type] ?? '#6b7280'}22`,
                color: TYPE_COLOR[log.type] ?? '#6b7280',
                fontSize: '0.72rem', letterSpacing: '0.02em',
              }}>
                {log.type}
              </span>
              <span style={{ color: 'var(--text)' }} title={log.actorEmail}>{log.actorEmail}</span>
              <span style={{ color: 'var(--text-muted)' }}>{log.tenantId}</span>
              <span style={{ color: 'var(--text-muted)' }}>{log.ip ?? '—'}</span>
              <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>
                {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          ))}
          {logs.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No audit events found.</p>}
        </div>
      )}
    </div>
  )
}
