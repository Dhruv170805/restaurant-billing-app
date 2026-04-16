'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('API Error')
  return res.json()
})

interface TenantResponse {
  slug: string
  name: string
  logoUrl: string | null
  theme: { primary: string; accent: string; font: string }
  plan: string
  config: {
    currencySymbol: string
    currencyCode: string
    currencyLocale: string
    taxEnabled: boolean
    taxRate: number
    taxLabel: string
    maxTables: number
  }
}

export default function SettingsPage() {
  const { data: initialTenant, error, mutate } = useSWR<TenantResponse>('/api/tenant', fetcher)
  
  const [tenant, setTenant] = useState<TenantResponse | null>(null)
  const [saving, setSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)

  // Sync state once data loads
  useEffect(() => {
    if (initialTenant && !tenant) {
      // Create a deep copy to edit locally
      setTenant(JSON.parse(JSON.stringify(initialTenant)))
    }
  }, [initialTenant, tenant])

  const handleSave = async () => {
    if (!tenant || saving) return
    setSaving(true)

    try {
      const payload = {
        name: tenant.name,
        theme: tenant.theme,
        config: {
          ...tenant.config,
          taxRate: tenant.config.taxRate, // ensure number
          maxTables: tenant.config.maxTables,
        }
      }

      const res = await fetch('/api/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success('Tenant Settings saved successfully!')
        mutate(tenant, false) // Optimistic UI update
        // Force a hard reload if brand colors changed to cascade changes
        if (tenant.theme.primary !== initialTenant?.theme.primary) {
          window.location.reload()
        }
      } else {
        toast.error('Failed to save settings')
      }
    } catch (err) {
      console.error('Failed to save settings', err)
      toast.error('Failed to save settings')
    }
    setSaving(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    setLogoUploading(true)
    const formData = new FormData()
    formData.append('logo', file)

    try {
      const res = await fetch('/api/tenant/logo', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const body = await res.json()
        const urlToAnalyze = body.logoUrl
        
        // Extract restaurant name from file.name
        const newName = file.name.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

        // Extract median hex color via Canvas
        const img = new Image()
        // Removed crossOrigin='Anonymous' to allow same-origin cookies through /api/storage auth
        img.src = urlToAnalyze
        
        img.onerror = () => {
          // Fallback if image fails to load into DOM
          setTenant((prev) => prev ? { ...prev, logoUrl: urlToAnalyze } : prev)
          mutate()
          toast.success('Logo uploaded (Theme extraction skipped)')
        }

        img.onload = async () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          if (ctx && tenant) {
             ctx.drawImage(img, 0, 0)
             const data = ctx.getImageData(0,0, canvas.width, canvas.height).data
             let r=0, g=0, b=0
             let count=0
             for(let i=0; i<data.length; i+=4) { 
               // Ignore fully transparent pixels
               if (data[i+3] > 10) {
                 r += data[i]
                 g += data[i+1]
                 b += data[i+2]
                 count++
               }
             }
             if(count > 0) {
                const hex = '#' + ((1 << 24) + (Math.round(r/count) << 16) + (Math.round(g/count) << 8) + Math.round(b/count)).toString(16).slice(1)
                
                // Submit PATCH immediately
                await fetch('/api/tenant', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newName, theme: { ...tenant.theme, primary: hex } }),
                })
                
                setTenant((prev) => prev ? { ...prev, logoUrl: urlToAnalyze, name: newName, theme: { ...prev.theme, primary: hex } } : prev)
                mutate(undefined, true)
                toast.success('Logo uploaded & Theme Extracted!')
             } else {
                setTenant((prev) => prev ? { ...prev, logoUrl: urlToAnalyze } : prev)
                mutate()
                toast.success('Logo uploaded completely!')
             }
          }
        }
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to upload logo')
      }
    } catch (err) {
      toast.error('Network error uploading logo')
    }
    setLogoUploading(false)
  }

  const updateConfig = (field: keyof TenantResponse['config'], value: any) => {
    setTenant((prev) => prev ? { ...prev, config: { ...prev.config, [field]: value } } : prev)
  }
  const updateTheme = (field: keyof TenantResponse['theme'], value: any) => {
    setTenant((prev) => prev ? { ...prev, theme: { ...prev.theme, [field]: value } } : prev)
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--foreground-subtle)' }}>
        <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</p>
        <p>Failed to load tenant configuration</p>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--foreground-subtle)' }}>
        <p style={{ fontSize: '1.1rem' }}>Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1>⚙️ Tenant Settings</h1>
          <p
            style={{ color: 'var(--foreground-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}
          >
            Configure your restaurant branding, currency, and tax
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>

      {/* Brand Details */}
      <div className="card">
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
          🏪 Brand & Visuals
        </h3>
        
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-6">
            <div style={{ 
              width: 80, height: 80, borderRadius: 12, overflow: 'hidden', 
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {tenant.logoUrl ? (
                 <img src={tenant.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 24 }}>🏢</span>
              )}
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Business Logo</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)', marginBottom: '0.75rem' }}>Max size 2MB. We support PNG, JPEG, SVG.</p>
              <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                {logoUploading ? 'Uploading...' : 'Upload Logo'}
                <input type="file" accept="image/png, image/jpeg, image/webp, image/svg+xml" style={{ display: 'none' }} onChange={handleLogoUpload} disabled={logoUploading} />
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Restaurant Name</label>
            <input
              type="text"
              className="form-input"
              value={tenant.name}
              onChange={(e) => setTenant((prev) => prev ? { ...prev, name: e.target.value } : prev)}
              placeholder="e.g. Acme Dining"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div className="form-group">
                <label className="form-label">Primary Brand Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={tenant.theme.primary}
                    onChange={(e) => updateTheme('primary', e.target.value)}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'transparent' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={tenant.theme.primary}
                    onChange={(e) => updateTheme('primary', e.target.value)}
                  />
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="card">
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
          💰 Currency Preferences
        </h3>
        <div className="flex flex-col gap-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Symbol</label>
              <input
                type="text"
                className="form-input"
                value={tenant.config.currencySymbol}
                onChange={(e) => updateConfig('currencySymbol', e.target.value)}
                placeholder="₹"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Code</label>
              <input
                type="text"
                className="form-input"
                value={tenant.config.currencyCode}
                onChange={(e) => updateConfig('currencyCode', e.target.value)}
                placeholder="INR"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Locale Format</label>
              <input
                type="text"
                className="form-input"
                value={tenant.config.currencyLocale}
                onChange={(e) => updateConfig('currencyLocale', e.target.value)}
                placeholder="en-IN"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tax */}
      <div className="card">
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>📊 Tax Config</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <label
              style={{
                position: 'relative',
                display: 'inline-block',
                width: '48px',
                height: '26px',
              }}
            >
              <input
                type="checkbox"
                checked={tenant.config.taxEnabled}
                onChange={(e) => updateConfig('taxEnabled', e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  inset: 0,
                  background: tenant.config.taxEnabled ? 'var(--primary, #f37c22)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '26px',
                  transition: 'all 0.3s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    content: '""',
                    width: '20px',
                    height: '20px',
                    left: tenant.config.taxEnabled ? '24px' : '3px',
                    bottom: '3px',
                    background: '#fff',
                    borderRadius: '50%',
                    transition: 'all 0.3s',
                  }}
                />
              </span>
            </label>
            <span style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>
              Automatically apply tax to orders
            </span>
          </div>
          {tenant.config.taxEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Tax Label</label>
                <input
                  type="text"
                  className="form-input"
                  value={tenant.config.taxLabel}
                  onChange={(e) => updateConfig('taxLabel', e.target.value)}
                  placeholder="GST"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tax Rate (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={tenant.config.taxRate * 100}
                  onChange={(e) => updateConfig('taxRate', parseFloat(e.target.value) / 100 || 0)}
                  placeholder="5"
                  min="0"
                  max="100"
                  step="0.5"
                />
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
