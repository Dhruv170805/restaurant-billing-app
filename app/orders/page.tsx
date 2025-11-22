'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Order {
    id: number
    createdAt: string
    total: number
    status: string
    items: { menuItem: { name: string } }[]
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        const res = await fetch('/api/orders')
        const data = await res.json()
        setOrders(data)
        setLoading(false)
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1>Orders History</h1>
                <Link href="/pos" className="btn btn-primary">
                    New Order
                </Link>
            </div>

            <div className="card">
                {loading ? (
                    <p>Loading...</p>
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
                                    <td>#{order.id}</td>
                                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                                    <td>{order.items.length} items</td>
                                    <td>${order.total.toFixed(2)}</td>
                                    <td>
                                        <span className={`badge ${order.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
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
