'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { formatPriceWithSettings } from '@/lib/pricing'

interface Category {
    id: number
    name: string
    itemCount: number
}

interface MenuItem {
    id: number
    name: string
    price: number
    category: { id: number; name: string }
}

interface Settings {
    currencyLocale: string
    currencyCode: string
}

export default function MenuPage() {
    const [items, setItems] = useState<MenuItem[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [settings, setSettings] = useState<Settings | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
    const [formName, setFormName] = useState('')
    const [formPrice, setFormPrice] = useState('')
    const [formCategoryId, setFormCategoryId] = useState<number | ''>('')
    const [submitting, setSubmitting] = useState(false)

    // Category modal
    const [showCatModal, setShowCatModal] = useState(false)
    const [catName, setCatName] = useState('')

    const fetchData = async () => {
        try {
            const [menuRes, catRes] = await Promise.all([
                fetch('/api/menu'),
                fetch('/api/categories'),
            ])
            if (menuRes.ok) setItems(await menuRes.json())
            if (catRes.ok) setCategories(await catRes.json())
        } catch (err) {
            console.error('Failed to load data', err)
            toast.error('Failed to load menu data')
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
        fetch('/api/settings').then(r => r.json()).then(setSettings).catch(console.error)
    }, [])

    const fmtPrice = (amount: number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount
        if (!settings) return `₹${num.toFixed(2)}`
        return formatPriceWithSettings(num, settings.currencyLocale, settings.currencyCode)
    }

    const allCategories = ['All', ...categories.map(c => c.name)]

    const filteredItems = items.filter(i => {
        const matchesCategory = selectedCategory === 'All' || i.category.name === selectedCategory
        const matchesSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    // Group items by category for table display
    const groupedItems = filteredItems.reduce((acc, item) => {
        const cat = item.category.name
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(item)
        return acc
    }, {} as Record<string, MenuItem[]>)

    // Item CRUD
    const openAddModal = () => {
        setEditingItem(null)
        setFormName('')
        setFormPrice('')
        setFormCategoryId(categories[0]?.id || '')
        setShowModal(true)
    }

    const openEditModal = (item: MenuItem) => {
        setEditingItem(item)
        setFormName(item.name)
        setFormPrice(String(typeof item.price === 'string' ? item.price : item.price.toString()))
        setFormCategoryId(item.category.id)
        setShowModal(true)
    }

    const handleSubmitItem = async () => {
        if (!formName || !formPrice || !formCategoryId) {
            toast.error('All fields are required')
            return
        }
        setSubmitting(true)

        try {
            const url = editingItem ? `/api/menu/${editingItem.id}` : '/api/menu'
            const method = editingItem ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formName.toUpperCase(),
                    price: parseFloat(formPrice),
                    categoryId: formCategoryId,
                }),
            })

            if (res.ok) {
                toast.success(editingItem ? 'Item updated!' : 'Item added!')
                setShowModal(false)
                fetchData()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Operation failed')
            }
        } catch (err) {
            console.error('Failed to save item', err)
            toast.error('Failed to save item')
        }
        setSubmitting(false)
    }

    const handleDeleteItem = async (id: number) => {
        if (!confirm('Delete this menu item?')) return

        try {
            const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Item deleted')
                fetchData()
            } else {
                toast.error('Failed to delete item')
            }
        } catch (err) {
            console.error('Failed to delete item', err)
            toast.error('Failed to delete item')
        }
    }

    // Category CRUD
    const handleAddCategory = async () => {
        if (!catName.trim()) {
            toast.error('Category name is required')
            return
        }

        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: catName }),
            })

            if (res.ok) {
                toast.success('Category added!')
                setShowCatModal(false)
                setCatName('')
                fetchData()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to add category')
            }
        } catch (err) {
            console.error('Failed to add category', err)
            toast.error('Failed to add category')
        }
    }

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Delete this category? (Only works if empty)')) return

        try {
            const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Category deleted')
                fetchData()
            } else {
                const data = await res.json()
                toast.error(data.error || 'Failed to delete category')
            }
        } catch (err) {
            console.error('Failed to delete category', err)
            toast.error('Failed to delete category')
        }
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1>Menu Management</h1>
                    <p style={{ color: 'var(--foreground-muted)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                        {items.length} items across {categories.length} categories
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="btn btn-secondary" onClick={() => setShowCatModal(true)}>
                        Manage Categories
                    </button>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        + Add Item
                    </button>
                </div>
            </div>

            {/* Search + Category Filter Row */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                flexWrap: 'wrap',
            }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '0 0 280px' }}>
                    <span style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--foreground-muted)',
                        fontSize: '0.9rem',
                        pointerEvents: 'none',
                    }}>🔍</span>
                    <input
                        type="text"
                        className="form-input"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search menu items..."
                        style={{
                            paddingLeft: '2.25rem',
                            height: '2.5rem',
                            fontSize: '0.85rem',
                        }}
                    />
                </div>

                {/* Category Pills */}
                <div className="flex gap-2 overflow-x-auto" style={{ flex: 1 }}>
                    {allCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                        >
                            {cat}
                            {cat !== 'All' && (
                                <span style={{
                                    fontSize: '0.65rem',
                                    opacity: 0.6,
                                    marginLeft: '0.3rem',
                                }}>
                                    {categories.find(c => c.name === cat)?.itemCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>



            {/* Menu Items Cards */}
            {loading ? (
                <div className="card">
                    <p style={{ color: 'var(--foreground-subtle)', padding: '2rem', textAlign: 'center' }}>Loading menu...</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground-subtle)' }}>
                    <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</p>
                    <p>{searchQuery ? 'No items match your search' : 'No items in this category'}</p>
                </div>
            ) : (
                Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
                    <div key={categoryName} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Category Section Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                            }}>
                                <span style={{
                                    display: 'inline-block',
                                    width: '4px',
                                    height: '20px',
                                    background: 'linear-gradient(to bottom, var(--primary), var(--primary-light))',
                                    borderRadius: '2px',
                                }} />
                                <span style={{
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    color: 'var(--foreground)',
                                }}>
                                    {categoryName}
                                </span>
                            </div>
                            <span style={{
                                fontSize: '0.7rem',
                                color: 'var(--foreground-muted)',
                                background: 'rgba(255,255,255,0.06)',
                                padding: '0.2rem 0.7rem',
                                borderRadius: '9999px',
                                border: '1px solid var(--glass-border)',
                            }}>
                                {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Cards Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: '0.75rem',
                        }}>
                            {categoryItems.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        position: 'relative',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '14px',
                                        padding: '1rem 1.1rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.6rem',
                                        transition: 'all 0.2s ease',
                                        cursor: 'default',
                                        overflow: 'hidden',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                                        e.currentTarget.style.transform = 'translateY(-2px)'
                                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                                        e.currentTarget.style.borderColor = 'var(--glass-border)'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                >
                                    {/* Top gradient accent */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '3px',
                                        background: 'linear-gradient(90deg, var(--primary), var(--primary-light))',
                                        opacity: 0.6,
                                        borderRadius: '14px 14px 0 0',
                                    }} />

                                    {/* Item Name */}
                                    <p style={{
                                        fontWeight: 600,
                                        fontSize: '0.88rem',
                                        color: 'var(--foreground)',
                                        lineHeight: 1.3,
                                        paddingRight: '0.5rem',
                                        minHeight: '2.3em',
                                    }}>
                                        {item.name}
                                    </p>

                                    {/* Price */}
                                    <p style={{
                                        color: 'var(--primary-light)',
                                        fontWeight: 800,
                                        fontSize: '1.2rem',
                                        fontFamily: 'monospace',
                                        letterSpacing: '-0.02em',
                                    }}>
                                        {fmtPrice(item.price)}
                                    </p>

                                    {/* Footer: category badge + actions */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: 'auto',
                                        paddingTop: '0.4rem',
                                        borderTop: '1px solid rgba(255,255,255,0.04)',
                                    }}>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            color: 'var(--foreground-muted)',
                                            background: 'rgba(255,255,255,0.05)',
                                            padding: '0.15rem 0.55rem',
                                            borderRadius: '9999px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.04em',
                                        }}>
                                            {item.category.name}
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            <button
                                                onClick={() => openEditModal(item)}
                                                style={{
                                                    background: 'rgba(255,255,255,0.06)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '7px',
                                                    padding: '0.25rem 0.5rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.65rem',
                                                    color: 'var(--foreground-muted)',
                                                    transition: 'all 0.15s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.2rem',
                                                }}
                                                title="Edit"
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
                                                    e.currentTarget.style.color = 'var(--foreground)'
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                                                    e.currentTarget.style.color = 'var(--foreground-muted)'
                                                }}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDeleteItem(item.id)}
                                                style={{
                                                    background: 'rgba(255,80,80,0.06)',
                                                    border: '1px solid rgba(255,80,80,0.12)',
                                                    borderRadius: '7px',
                                                    padding: '0.25rem 0.5rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.65rem',
                                                    color: 'var(--danger)',
                                                    transition: 'all 0.15s',
                                                }}
                                                title="Delete"
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(255,80,80,0.18)'
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(255,80,80,0.06)'
                                                }}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {/* Summary Bar */}
            {!loading && filteredItems.length > 0 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 1.25rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    fontSize: '0.8rem',
                    color: 'var(--foreground-muted)',
                }}>
                    <span>
                        Showing <strong style={{ color: 'var(--foreground)' }}>{filteredItems.length}</strong> of {items.length} items
                        {selectedCategory !== 'All' && <> in <strong style={{ color: 'var(--foreground)' }}>{selectedCategory}</strong></>}
                        {searchQuery && <> matching &quot;<strong style={{ color: 'var(--foreground)' }}>{searchQuery}</strong>&quot;</>}
                    </span>
                    <span>
                        {Object.keys(groupedItems).length} categor{Object.keys(groupedItems).length === 1 ? 'y' : 'ies'}
                    </span>
                </div>
            )}

            {/* Add/Edit Item Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '1.5rem' }}>
                            {editingItem ? '✏️ Edit Item' : '➕ Add Item'}
                        </h2>
                        <div className="flex flex-col gap-4">
                            <div className="form-group">
                                <label className="form-label">Item Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="e.g. PANEER BUTTER MASALA"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Price</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={formPrice}
                                    onChange={e => setFormPrice(e.target.value)}
                                    placeholder="e.g. 180"
                                    min="0"
                                    step="1"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-input"
                                    value={formCategoryId}
                                    onChange={e => setFormCategoryId(parseInt(e.target.value))}
                                >
                                    <option value="">Select category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3" style={{ marginTop: '0.5rem' }}>
                                <button
                                    className="btn btn-secondary flex-1"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary flex-1"
                                    onClick={handleSubmitItem}
                                    disabled={submitting}
                                >
                                    {submitting ? 'Saving...' : editingItem ? 'Update' : 'Add Item'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Categories Modal */}
            {showCatModal && (
                <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Manage Categories</h2>

                        <div className="flex flex-col gap-4">
                            {categories.length > 0 && (
                                <div style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                }}>
                                    {categories.map(cat => (
                                        <div key={cat.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem 1rem',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <span style={{ fontWeight: 500 }}>
                                                {cat.name} <span style={{ color: 'var(--foreground-muted)', fontSize: '0.8rem' }}>({cat.itemCount} items)</span>
                                            </span>
                                            {cat.itemCount === 0 ? (
                                                <button
                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                    style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                                                >
                                                    Delete
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--foreground-subtle)' }}>In Use</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                                <label className="form-label">Add New Category</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={catName}
                                        onChange={e => setCatName(e.target.value)}
                                        placeholder="e.g. DESSERTS"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleAddCategory}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3" style={{ marginTop: '0.5rem' }}>
                                <button
                                    className="btn btn-secondary flex-1"
                                    onClick={() => setShowCatModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
