'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface MenuItem {
    id: number
    name: string
    price: number
    categoryId: number
    category: { id: number, name: string }
}

interface CartItem extends MenuItem {
    quantity: number
}

export default function POSPage() {
    const router = useRouter()
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>('All')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchMenu()
    }, [])

    const fetchMenu = async () => {
        const res = await fetch('/api/menu')
        const data = await res.json()
        setMenuItems(data)

        const cats = Array.from(new Set(data.map((item: MenuItem) => item.category.name))) as string[]
        setCategories(['All', ...cats])
        setLoading(false)
    }

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id)
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
            }
            return [...prev, { ...item, quantity: 1 }]
        })
    }

    const removeFromCart = (itemId: number) => {
        setCart(prev => prev.filter(item => item.id !== itemId))
    }

    const updateQuantity = (itemId: number, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.id === itemId) {
                    const newQty = item.quantity + delta
                    return newQty > 0 ? { ...item, quantity: newQty } : item
                }
                return item
            })
        })
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    const handleCheckout = async () => {
        if (cart.length === 0) return

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    total
                })
            })

            if (res.ok) {
                const order = await res.json()
                router.push(`/orders/${order.id}`)
            }
        } catch (error) {
            console.error('Checkout failed', error)
        }
    }

    const filteredItems = selectedCategory === 'All'
        ? menuItems
        : menuItems.filter(item => item.category.name === selectedCategory)

    return (
        <div className="flex gap-6 h-[calc(100vh-100px)]">
            {/* Left Side - Menu */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="grid overflow-y-auto pr-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', alignContent: 'start' }}>
                    {filteredItems.map(item => (
                        <div
                            key={item.id}
                            className="card cursor-pointer hover:border-blue-500 transition-colors"
                            onClick={() => addToCart(item)}
                        >
                            <h3 className="text-lg">{item.name}</h3>
                            <p className="text-primary font-bold mt-2">${item.price.toFixed(2)}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Side - Cart */}
            <div className="w-96 card flex flex-col h-full">
                <h2 className="mb-4 border-b border-gray-700 pb-4">Current Order</h2>

                <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                    {cart.length === 0 ? (
                        <p className="text-gray-500 text-center mt-10">Cart is empty</p>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-800 p-3 rounded">
                                <div>
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-sm text-gray-400">${item.price.toFixed(2)} x {item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-slate-700 rounded">
                                        <button
                                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-600 rounded"
                                            onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                                        >
                                            -
                                        </button>
                                        <span className="text-sm w-4 text-center">{item.quantity}</span>
                                        <button
                                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-600 rounded"
                                            onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <button
                                        className="text-red-400 hover:text-red-300"
                                        onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t border-gray-700 pt-4 mt-4">
                    <div className="flex justify-between text-xl font-bold mb-4">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                    <button
                        className="btn btn-primary w-full py-4 text-lg"
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                    >
                        Checkout & Print Bill
                    </button>
                </div>
            </div>
        </div>
    )
}
