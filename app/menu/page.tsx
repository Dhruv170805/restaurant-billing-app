'use client'

import { useState, useEffect } from 'react'

interface MenuItem {
    id: number
    name: string
    price: number
    category: { name: string }
}

export default function MenuPage() {
    const [items, setItems] = useState<MenuItem[]>([])
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        categoryName: ''
    })

    useEffect(() => {
        fetchItems()
    }, [])

    const fetchItems = async () => {
        const res = await fetch('/api/menu')
        const data = await res.json()
        setItems(data)
        setLoading(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await fetch('/api/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
        setFormData({ name: '', price: '', categoryName: '' })
        fetchItems()
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1>Menu Management</h1>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <div className="card">
                    <h3>Current Menu</h3>
                    {loading ? (
                        <p>Loading...</p>
                    ) : (
                        <table className="table mt-4">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td><span className="badge badge-success">{item.category.name}</span></td>
                                        <td>${item.price.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="card h-fit">
                    <h3>Add New Item</h3>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                        <div>
                            <label className="block mb-2 text-sm font-medium">Item Name</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium">Category</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.categoryName}
                                onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                                required
                                placeholder="e.g. Starters"
                            />
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium">Price</label>
                            <input
                                type="number"
                                step="0.01"
                                className="input"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-full">
                            Add Item
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
