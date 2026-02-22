'use client'

import { useState, useEffect } from 'react'
import { formatPriceWithSettings } from '@/lib/pricing'

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null)
    const [settings, setSettings] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            fetch('/api/dashboard').then(r => r.json()),
            fetch('/api/settings').then(r => r.json())
        ]).then(([dashboardStats, appSettings]) => {
            setStats(dashboardStats)
            setSettings(appSettings)
            setLoading(false)
        }).catch(err => {
            console.error(err)
            setLoading(false)
        })
    }, [])

    const fmtPrice = (amount: number) => {
        if (!settings) return `₹${amount.toFixed(2)}`
        return formatPriceWithSettings(amount, settings.currencyLocale, settings.currencyCode)
    }

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>Loading sales dashboard...</div>

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Sales Dashboard</h1>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <div className="card" style={{ padding: '2rem' }}>
                    <p style={{ color: 'var(--foreground-muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>Today's Revenue</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{fmtPrice(stats?.todayRevenue || 0)}</p>
                </div>
                <div className="card" style={{ padding: '2rem' }}>
                    <p style={{ color: 'var(--foreground-muted)', fontSize: '1rem', marginBottom: '0.5rem' }}>Completed Orders</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>{(stats?.todayOrders || 0) - (stats?.pendingOrders || 0)}</p>
                </div>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1.5rem' }}>Payment Breakdown</h2>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
                    <div className="flex justify-between items-center">
                        <div>
                            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Cash Payments</p>
                            <p style={{ fontSize: '1.8rem', fontWeight: 700 }}>{fmtPrice(stats?.cashRevenue || 0)}</p>
                        </div>
                        <span style={{ fontSize: '2.5rem' }}>💵</span>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
                    <div className="flex justify-between items-center">
                        <div>
                            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Online Payments</p>
                            <p style={{ fontSize: '1.8rem', fontWeight: 700 }}>{fmtPrice(stats?.onlineRevenue || 0)}</p>
                        </div>
                        <span style={{ fontSize: '2.5rem' }}>💳</span>
                    </div>
                </div>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '2rem', marginBottom: '1rem' }}>Recent Completed Orders</h2>
            <div className="card" style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ textAlign: 'left', padding: '1.25rem 1.5rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>Order ID</th>
                            <th style={{ textAlign: 'center', padding: '1.25rem 1.5rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>Method</th>
                            <th style={{ textAlign: 'right', padding: '1.25rem 1.5rem', fontWeight: 600, color: 'var(--foreground-muted)' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats?.recentOrders?.filter((o: any) => o.status === 'PAID').map((order: any) => (
                            <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>#{order.id}</td>
                                <td style={{ textAlign: 'center', padding: '1.25rem 1.5rem' }}>
                                    <span className="badge" style={{ background: 'var(--glass-bg)', color: 'var(--foreground)' }}>
                                        {order.paymentMethod || 'CASH'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right', padding: '1.25rem 1.5rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                                    {fmtPrice(order.total)}
                                </td>
                            </tr>
                        ))}
                        {stats?.recentOrders?.filter((o: any) => o.status === 'PAID').length === 0 && (
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--foreground-muted)' }}>
                                    No completed orders yet today.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
