'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

interface OrderItem {
    id: number
    quantity: number
    priceAtOrder: number
    menuItem: {
        name: string
    }
}

interface Order {
    id: number
    createdAt: string
    total: number
    status: string
    items: OrderItem[]
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const [order, setOrder] = useState<Order | null>(null)
    const [loading, setLoading] = useState(true)

    // Unwrap params using React.use()
    const resolvedParams = use(params)

    useEffect(() => {
        fetchOrder()
    }, [resolvedParams.id])

    const fetchOrder = async () => {
        const res = await fetch(`/api/orders/${resolvedParams.id}`)
        if (res.ok) {
            const data = await res.json()
            setOrder(data)
        }
        setLoading(false)
    }

    if (loading) return <div className="p-8 text-center">Loading order...</div>
    if (!order) return <div className="p-8 text-center">Order not found</div>

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <button onClick={() => router.back()} className="btn btn-secondary">
                    ← Back
                </button>
                <button onClick={() => window.print()} className="btn btn-primary">
                    Print Bill
                </button>
            </div>

            <div className="card bg-white text-black p-8 print:shadow-none print:border-none print:p-0">
                <div className="text-center mb-8 border-b border-gray-200 pb-4">
                    <h1 className="text-3xl font-bold mb-2">RestoBill</h1>
                    <p className="text-gray-600">123 Restaurant Street, City</p>
                    <p className="text-gray-600">Tel: +1 234 567 890</p>
                </div>

                <div className="flex justify-between mb-6 text-sm">
                    <div>
                        <p className="text-gray-600">Order #</p>
                        <p className="font-bold">{order.id}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-600">Date</p>
                        <p className="font-bold">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                </div>

                <table className="w-full mb-6">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="text-left py-2">Item</th>
                            <th className="text-center py-2">Qty</th>
                            <th className="text-right py-2">Price</th>
                            <th className="text-right py-2">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item) => (
                            <tr key={item.id} className="border-b border-gray-200">
                                <td className="py-2">{item.menuItem.name}</td>
                                <td className="text-center py-2">{item.quantity}</td>
                                <td className="text-right py-2">${item.priceAtOrder.toFixed(2)}</td>
                                <td className="text-right py-2">${(item.priceAtOrder * item.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end border-t-2 border-black pt-4">
                    <div className="text-right">
                        <p className="text-xl font-bold">Total: ${order.total.toFixed(2)}</p>
                        <p className="text-sm text-gray-600 mt-1">Status: {order.status}</p>
                    </div>
                </div>

                <div className="text-center mt-8 pt-4 border-t border-gray-200 text-sm text-gray-600">
                    <p>Thank you for dining with us!</p>
                </div>
            </div>

            <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .card, .card * {
            visibility: visible;
          }
          .card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .navbar, .btn {
            display: none !important;
          }
        }
      `}</style>
        </div>
    )
}
