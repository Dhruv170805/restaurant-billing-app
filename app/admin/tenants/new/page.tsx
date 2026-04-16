'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PLANS = ['free', 'starter', 'pro'] as const

export default function NewTenantPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    slug: '', name: '', adminEmail: '', adminPassword: '', adminName: '', plan: 'free' as typeof PLANS[number],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('access_token')}` },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return }
    router.push('/admin/tenants')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/admin/tenants" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>← Back</Link>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>New Tenant</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[
          { key: 'name', label: 'Restaurant Name', placeholder: 'Taj Restaurant', type: 'text' },
          { key: 'slug', label: 'Slug (URL identifier)', placeholder: 'taj-restaurant', type: 'text' },
          { key: 'adminName', label: 'Admin Name', placeholder: 'John Doe', type: 'text' },
          { key: 'adminEmail', label: 'Admin Email', placeholder: 'admin@example.com', type: 'email' },
          { key: 'adminPassword', label: 'Admin Password', placeholder: 'Min 8 characters', type: 'password' },
        ].map(f => (
          <Field key={f.key} label={f.label} type={f.type} placeholder={f.placeholder}
            value={(form as Record<string,string>)[f.key]}
            onChange={v => set(f.key, v)} />
        ))}

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Plan</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {PLANS.map(p => (
              <button key={p} type="button" onClick={() => set('plan', p)} style={{
                flex: 1, padding: '0.6rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
                background: form.plan === p ? 'linear-gradient(135deg,#f37c22,#e8521a)' : 'rgba(255,255,255,0.06)',
                color: form.plan === p ? 'white' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.875rem' }}>{error}</div>}

        <button type="submit" disabled={loading} style={{
          padding: '0.875rem', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#f37c22,#e8521a)',
          color: 'white', fontWeight: 700, fontSize: '1rem', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? 'Creating…' : 'Create Tenant →'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, type, placeholder }: { label: string; value: string; onChange: (v: string) => void; type: string; placeholder: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>{label}</label>
      <input type={type} required value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', padding: '0.75rem 1rem', borderRadius: 10, boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--text)', fontSize: '0.95rem', outline: 'none',
        }} />
    </div>
  )
}
