'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatPriceWithSettings } from '@/lib/pricing'

interface TableInfo {
    number: number
    status: 'available' | 'occupied'
    order: {
        id: number
        tokenNumber: number
        total: number
        itemCount: number
        createdAt: string
    } | null
}

interface Settings {
    currencyLocale: string
    currencyCode: string
}

export default function Home() {
    const router = useRouter()
    const [tables, setTables] = useState<TableInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState<Settings | null>(null)

    const fetchTables = async () => {
        try {
            const res = await fetch('/api/tables')
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            setTables(data)
        } catch (err) {
            console.error('Failed to load tables', err)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchTables()
        fetch('/api/settings').then(r => r.json()).then(setSettings).catch(console.error)
        const interval = setInterval(fetchTables, 10000)
        return () => clearInterval(interval)
    }, [])

    const fmtPrice = (amount: number) => {
        if (!settings) return `₹${amount.toFixed(2)}`
        return formatPriceWithSettings(amount, settings.currencyLocale, settings.currencyCode)
    }

    const handleTableClick = (table: TableInfo) => {
        if (table.status === 'occupied' && table.order) {
            router.push(`/orders/${table.order.id}`)
        } else {
            router.push(`/pos?table=${table.number}`)
        }
    }

    const occupiedCount = tables.filter(t => t.status === 'occupied').length
    const availableCount = tables.filter(t => t.status === 'available').length

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1>Tables</h1>
                    <p style={{ color: 'var(--foreground-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                        Tap an available table to start an order
                    </p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex gap-3 items-center" style={{ fontSize: '0.85rem' }}>
                        <span className="flex items-center gap-2">
                            <span style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: 'var(--success)',
                                display: 'inline-block',
                                boxShadow: '0 0 8px var(--success-glow)',
                            }}></span>
                            <span style={{ color: 'var(--foreground-muted)' }}>{availableCount} Available</span>
                        </span>
                        <span className="flex items-center gap-2">
                            <span style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: 'var(--danger)',
                                display: 'inline-block',
                                boxShadow: '0 0 8px rgba(248,113,113,0.4)',
                            }}></span>
                            <span style={{ color: 'var(--foreground-muted)' }}>{occupiedCount} Occupied</span>
                        </span>
                    </div>
                </div>
            </div>

            {loading ? (
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
                    {tables.map(table => (
                        <div
                            key={table.number}
                            className={`table-card ${table.status}`}
                            onClick={() => handleTableClick(table)}
                        >
                            <div className="table-card-header">
                                <span className="table-card-number">{table.number}</span>
                                <span className={`table-card-badge ${table.status}`}>
                                    {table.status === 'available' ? '● Free' : '● Occupied'}
                                </span>
                            </div>

                            {table.status === 'occupied' && table.order ? (
                                <div className="table-card-details">
                                    <div className="flex justify-between items-center" style={{ marginBottom: '0.35rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                                            Token #{table.order.tokenNumber}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
                                            {table.order.itemCount} items
                                        </span>
                                    </div>
                                    <p style={{
                                        fontSize: '1.15rem',
                                        fontWeight: 700,
                                        color: 'var(--foreground)',
                                    }}>
                                        {fmtPrice(table.order.total)}
                                    </p>
                                </div>
                            ) : (
                                <div className="table-card-details">
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--foreground-subtle)',
                                        textAlign: 'center',
                                    }}>
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
