'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get('from') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totp, setTotp] = useState('')
  const [totpRequired, setTotpRequired] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tenant, setTenant] = useState<{ name: string; logoUrl?: string; theme: { primary: string } } | null>(null)

  // Boot tenant config for branding
  useEffect(() => {
    fetch('/api/tenant').then(r => r.ok ? r.json() : null).then(t => {
      if (t) {
        setTenant(t)
        document.documentElement.style.setProperty('--primary', t.theme?.primary || '#f37c22')
        document.title = `${t.name} — Login`
      }
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(totpRequired ? { totp } : {}) }),
      })

      const data = await res.json()

      if (res.status === 401 && data.totpRequired) {
        setTotpRequired(true)
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      // Store access token (cookie is set by server, but also keep in memory)
      if (data.accessToken) {
        sessionStorage.setItem('access_token', data.accessToken)
      }

      router.push(from)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(243,124,34,0.15) 0%, transparent 70%), var(--bg)',
      padding: '1rem',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(243,124,34,0.1), transparent)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
      }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {tenant?.logoUrl && (
            <img src={tenant.logoUrl} alt="logo" style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: 12, borderRadius: 12 }} />
          )}
          <h1 style={{
            fontSize: '1.7rem', fontWeight: 900, margin: 0,
            background: 'linear-gradient(135deg, #f37c22, #e8521a)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px',
          }}>
            {tenant?.name || 'NEXUS POS'}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@restaurant.com"
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text)', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {totpRequired && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: '#f59e0b' }}>
                🔐 Two-Factor Code
              </label>
              <input
                id="login-totp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totp}
                onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
                  background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                  color: 'var(--text)', fontSize: '1.2rem', letterSpacing: '0.3em',
                  textAlign: 'center', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {error && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '10px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171', fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{
              padding: '0.875rem', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #f37c22, #e8521a)',
              color: 'white', fontWeight: 700, fontSize: '1rem',
              transition: 'all 0.2s', opacity: loading ? 0.7 : 1,
              boxShadow: loading ? 'none' : '0 4px 20px rgba(243,124,34,0.35)',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          NEXUS POS &bull; Made By Dhruv Patel
        </div>
      </div>
    </div>
  )
}
