'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatPriceWithSettings } from '@/lib/pricing'

interface Order {
    id: number
    createdAt: string
    total: number
    status: string
    items: { menuItem: { name: string } }[]
}

interface Settings {
    currencyLocale: string
    currencyCode: string
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState<Settings | null>(null)

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch('/api/orders')
                if (!res.ok) throw new Error('Failed to fetch')
                const data = await res.json()
                setOrders(data)
            } catch (err) {
                console.error('Failed to load orders', err)
                toast.error('Failed to load orders')
            }
            setLoading(false)
        }
        fetchOrders()
        fetch('/api/settings').then(r => r.json()).then(setSettings).catch(console.error)
    }, [])

    const fmtPrice = (amount: number) => {
        if (!settings) return `₹${amount.toFixed(2)}`
        return formatPriceWithSettings(amount, settings.currencyLocale, settings.currencyCode)
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1>Orders History</h1>
                    <p style={{ color: 'var(--foreground-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                        View and manage all past orders
                    </p>
                </div>
                <Link href="/pos" className="btn btn-primary">
                    ⚡ New Order
                </Link>
            </div>

            <div className="card">
                {loading ? (
                    <p style={{ color: 'var(--foreground-subtle)', padding: '2rem', textAlign: 'center' }}>Loading orders...</p>
                ) : orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground-subtle)' }}>
                        <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</p>
                        <p>No orders yet. Create one from the POS terminal.</p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>#{order.id}</td>
                                    <td style={{ color: 'var(--foreground-muted)' }}>{new Date(order.createdAt).toLocaleString()}</td>
                                    <td>{order.items.length} items</td>
                                    <td style={{ fontWeight: 600 }}>{fmtPrice(order.total)}</td>
                                    <td>
                                        <span className={`badge ${order.status === 'PAID' ? 'badge-success' : order.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>
                                        <Link href={`/orders/${order.id}`} className="btn btn-secondary text-sm py-1 px-3">
                                            View Bill
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
