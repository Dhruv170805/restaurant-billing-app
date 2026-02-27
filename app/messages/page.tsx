'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DbCustomer } from '@/lib/db/schema'
import { useSettings } from '@/hooks/useData'

export default function MessagesPage() {
    const [customers, setCustomers] = useState<DbCustomer[]>([])
    const [loading, setLoading] = useState(true)
    const [messageText, setMessageText] = useState('')
    const [imageUrl, setImageUrl] = useState('')

    const { settings } = useSettings()

    useEffect(() => {
        fetch('/api/customers')
            .then(r => r.json())
            .then(data => setCustomers(data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const generateWaLink = (phone: string, name: string) => {
        const greeting = `Hello ${name},\n\n`
        const body = messageText ? `${messageText}\n\n` : ''
        const imgStr = imageUrl ? `Check this out: ${imageUrl}\n\n` : ''
        const signoff = `Best regards,\n${settings?.restaurantName || 'Our Restaurant'}`

        const fullText = encodeURIComponent(greeting + body + imgStr + signoff)
        return `https://wa.me/${phone}?text=${fullText}`
    }

    if (loading) {
        return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading CRM Data...</div>
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
            <PageHeader title="WhatsApp Marketing & CRM" />

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Campaign Composer */}
                <div className="card" style={{ alignSelf: 'start' }}>
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 700 }}>
                        📢 Promo Composer
                    </h3>
                    <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Write a message to broadcast to your customers (discounts, festivals, updates).
                    </p>

                    <div className="form-group">
                        <label className="form-label">Message Text</label>
                        <textarea
                            className="form-input"
                            rows={5}
                            placeholder="e.g. 🎒 Enjoy 20% off all orders this weekend!"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="form-label">Attached Image URL (Optional)</label>
                        <input
                            type="url"
                            className="form-input"
                            placeholder="e.g. https://example.com/promo-flyer.jpg"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                        />
                    </div>

                    {!settings?.ownerPhone && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--warning)', color: 'black', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                            <strong>⚠️ Heads up:</strong> You haven&apos;t set an Owner Phone Number in Settings. The WhatsApp links below will still work, but setting your number helps organize your business profile.
                        </div>
                    )}
                </div>

                {/* Customer Database */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                            👥 Customer Database ({customers.length})
                        </h3>
                    </div>

                    {customers.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                            No customers saved yet. They will appear here automatically when orders are marked as PAID!
                        </div>
                    ) : (
                        <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                        <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>Customer</th>
                                        <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>History</th>
                                        <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map((c) => (
                                        <tr key={c._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 600 }}>{c.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.2rem' }}>📞 {c.phone}</div>
                                            </td>
                                            <td style={{ textAlign: 'center', padding: '1rem' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{c.totalOrders} Orders</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>Last: {new Date(c.lastVisit).toLocaleDateString(settings?.currencyLocale || 'en-IN', { timeZone: settings?.timezone || 'Asia/Kolkata' })}</div>
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '1rem' }}>
                                                <a
                                                    href={generateWaLink(c.phone, c.name)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: '#25D366', color: 'white', border: 'none' }}
                                                >
                                                    Send WhatsApp
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
