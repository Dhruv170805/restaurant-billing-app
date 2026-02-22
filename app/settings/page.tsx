'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface Settings {
    restaurantName: string
    restaurantAddress: string
    restaurantPhone: string
    restaurantTagline: string
    currencySymbol: string
    currencyCode: string
    currencyLocale: string
    taxEnabled: boolean
    taxRate: number
    taxLabel: string
    tableCount: number
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings')
                if (!res.ok) throw new Error('Failed to fetch')
                const data = await res.json()
                setSettings(data)
            } catch (err) {
                console.error('Failed to load settings', err)
                toast.error('Failed to load settings')
            }
            setLoading(false)
        }
        fetchSettings()
    }, [])

    const handleSave = async () => {
        if (!settings || saving) return
        setSaving(true)

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            })

            if (res.ok) {
                const data = await res.json()
                setSettings(data)
                toast.success('Settings saved successfully!')
            } else {
                toast.error('Failed to save settings')
            }
        } catch (err) {
            console.error('Failed to save settings', err)
            toast.error('Failed to save settings')
        }
        setSaving(false)
    }

    const updateField = (field: keyof Settings, value: string | number | boolean) => {
        if (!settings) return
        setSettings({ ...settings, [field]: value })
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--foreground-subtle)' }}>
                <p style={{ fontSize: '1.1rem' }}>Loading settings...</p>
            </div>
        )
    }

    if (!settings) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--foreground-subtle)' }}>
                <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚠️</p>
                <p>Failed to load settings</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1>⚙️ Settings</h1>
                    <p style={{ color: 'var(--foreground-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                        Configure your restaurant details, currency, and tax
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : '💾 Save Settings'}
                </button>
            </div>

            {/* Restaurant Details */}
            <div className="card">
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
                    🏪 Restaurant Details
                </h3>
                <div className="flex flex-col gap-4">
                    <div className="form-group">
                        <label className="form-label">Restaurant Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={settings.restaurantName}
                            onChange={(e) => updateField('restaurantName', e.target.value)}
                            placeholder="e.g. Shreeji"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <input
                            type="text"
                            className="form-input"
                            value={settings.restaurantAddress}
                            onChange={(e) => updateField('restaurantAddress', e.target.value)}
                            placeholder="e.g. Rajkot, Gujarat, India"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input
                            type="text"
                            className="form-input"
                            value={settings.restaurantPhone}
                            onChange={(e) => updateField('restaurantPhone', e.target.value)}
                            placeholder="e.g. +91 98765 43210"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Receipt Tagline</label>
                        <input
                            type="text"
                            className="form-input"
                            value={settings.restaurantTagline}
                            onChange={(e) => updateField('restaurantTagline', e.target.value)}
                            placeholder="e.g. Thank you for dining with us!"
                        />
                    </div>
                </div>
            </div>

            {/* Currency */}
            <div className="card">
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
                    💰 Currency
                </h3>
                <div className="flex flex-col gap-4">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Symbol</label>
                            <input
                                type="text"
                                className="form-input"
                                value={settings.currencySymbol}
                                onChange={(e) => updateField('currencySymbol', e.target.value)}
                                placeholder="₹"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Code</label>
                            <input
                                type="text"
                                className="form-input"
                                value={settings.currencyCode}
                                onChange={(e) => updateField('currencyCode', e.target.value)}
                                placeholder="INR"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Locale</label>
                            <input
                                type="text"
                                className="form-input"
                                value={settings.currencyLocale}
                                onChange={(e) => updateField('currencyLocale', e.target.value)}
                                placeholder="en-IN"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tax */}
            <div className="card">
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
                    📊 Tax
                </h3>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <label style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '48px',
                            height: '26px',
                        }}>
                            <input
                                type="checkbox"
                                checked={settings.taxEnabled}
                                onChange={(e) => updateField('taxEnabled', e.target.checked)}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                inset: 0,
                                background: settings.taxEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                borderRadius: '26px',
                                transition: 'all 0.3s',
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    content: '""',
                                    width: '20px',
                                    height: '20px',
                                    left: settings.taxEnabled ? '24px' : '3px',
                                    bottom: '3px',
                                    background: '#fff',
                                    borderRadius: '50%',
                                    transition: 'all 0.3s',
                                }} />
                            </span>
                        </label>
                        <span style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>
                            Enable tax on orders
                        </span>
                    </div>
                    {settings.taxEnabled && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Tax Label</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={settings.taxLabel}
                                    onChange={(e) => updateField('taxLabel', e.target.value)}
                                    placeholder="GST"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tax Rate (%)</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={settings.taxRate * 100}
                                    onChange={(e) => updateField('taxRate', parseFloat(e.target.value) / 100 || 0)}
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

            {/* Tables */}
            <div className="card">
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
                    🍽️ Tables
                </h3>
                <div className="form-group">
                    <label className="form-label">Number of Tables</label>
                    <input
                        type="number"
                        className="form-input"
                        value={settings.tableCount}
                        onChange={(e) => updateField('tableCount', parseInt(e.target.value) || 1)}
                        min="1"
                        max="100"
                        style={{ maxWidth: '120px' }}
                    />
                </div>
            </div>
        </div>
    )
}
