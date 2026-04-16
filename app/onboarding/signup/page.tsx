'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({
    restaurantName: '',
    slug: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => {
    setForm(p => {
      const next = { ...p, [k]: v }
      // Auto-generate slug from restaurant name
      if (k === 'restaurantName') {
        next.slug = v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/onboarding/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantName: form.restaurantName,
        slug: form.slug,
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return }
    router.push('/login?from=onboarding')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(243,124,34,0.12) 0%, transparent 60%), var(--bg)',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2rem', fontWeight: 900, margin: 0,
            background: 'linear-gradient(135deg,#f37c22,#e8521a)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px',
          }}>
            NEXUS POS
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Create your free restaurant account
          </p>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '2rem',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        }}>
          {/* Progress */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.75rem' }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 99,
                background: s <= step ? 'linear-gradient(90deg,#f37c22,#e8521a)' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.4s',
              }} />
            ))}
          </div>

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2) } : handleSubmit}>
            {step === 1 && (
              <>
                <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 800 }}>Your Restaurant</h2>
                <Field label="Restaurant Name" value={form.restaurantName} onChange={v => set('restaurantName', v)}
                  placeholder="Taj Dhaba" required />
                <div style={{ height: 14 }} />
                <Field label="URL Slug" value={form.slug} onChange={v => set('slug', v.toLowerCase().replace(/[^a-z0-9-]/g,''))}
                  placeholder="taj-dhaba" required hint={`Your app URL: ${form.slug || 'your-slug'}.nexuspos.app`} />
              </>
            )}

            {step === 2 && (
              <>
                <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 800 }}>Your Account</h2>
                <Field label="Your Name" value={form.ownerName} onChange={v => set('ownerName', v)} placeholder="Ramesh Patel" required />
                <div style={{ height: 14 }} />
                <Field label="Email" type="email" value={form.email} onChange={v => set('email', v)} placeholder="owner@restaurant.com" required />
                <div style={{ height: 14 }} />
                <Field label="Password" type="password" value={form.password} onChange={v => set('password', v)} placeholder="Min 8 characters" required />
                <div style={{ height: 14 }} />
                <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={v => set('confirmPassword', v)} placeholder="Re-enter password" required />
              </>
            )}

            {error && (
              <div style={{ margin: '1rem 0 0', padding: '0.75rem', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem' }}>
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)} style={{
                  flex: 1, padding: '0.85rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.05)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600,
                }}>
                  ← Back
                </button>
              )}
              <button type="submit" disabled={loading} style={{
                flex: step === 2 ? 2 : 1, padding: '0.85rem', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#f37c22,#e8521a)',
                color: 'white', fontWeight: 700, fontSize: '1rem', opacity: loading ? 0.7 : 1,
              }}>
                {step === 1 ? 'Continue →' : loading ? 'Creating account…' : 'Create Account →'}
              </button>
            </div>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Already have an account? <Link href="/login" style={{ color: '#f37c22', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.6 }}>
          NEXUS POS &bull; Made By Dhruv Patel &bull; Free forever plan available
        </p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, required = false, hint }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean; hint?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>{label}</label>
      <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', padding: '0.75rem 1rem', borderRadius: 10, boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--text)', fontSize: '0.95rem', outline: 'none',
        }} />
      {hint && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}
