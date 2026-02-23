'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatPriceWithSettings } from '@/lib/pricing'
import { useMenu, useCategories, useSettings } from '@/hooks/useData'

import type { Category, MenuItem, AppSettings } from '@/types'

export default function MenuPage() {
  const { items, mutate: mutateMenu, isLoading: menuLoading } = useMenu()
  const { categories, mutate: mutateCats, isLoading: catsLoading } = useCategories()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const { settings } = useSettings()
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formCategoryId, setFormCategoryId] = useState<number | 'NEW' | ''>('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [submitting, setSubmitting] = useState(false)




  const fmtPrice = (amount: number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (!settings) return `₹${num.toFixed(2)}`
    return formatPriceWithSettings(num, settings.currencyLocale, settings.currencyCode)
  }

  const allCategories = ['All', ...categories.map((c) => c.name)]

  const filteredItems = items.filter((i) => {
    const matchesCategory = selectedCategory === 'All' || i.category.name === selectedCategory
    const matchesSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Group items by category for table display
  const groupedItems = filteredItems.reduce(
    (acc, item) => {
      const cat = item.category.name
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    },
    {} as Record<string, MenuItem[]>
  )

  // Item CRUD
  const openAddModal = () => {
    setEditingItem(null)
    setFormName('')
    setFormPrice('')
    setFormCategoryId(categories[0]?.id || '')
    setNewCategoryName('') // Clear new category name when adding
    setShowModal(true)
  }

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item)
    setFormName(item.name)
    setFormPrice(item.price.toString())
    setFormCategoryId(item.category.id)
    setNewCategoryName('')
    setShowModal(true)
  }

  const handleSubmitItem = async () => {
    if (!formName || !formPrice) {
      toast.error('Name and Price are required')
      return
    }

    if (formCategoryId === '' || (formCategoryId === 'NEW' && !newCategoryName.trim())) {
      toast.error('Valid category selection is required')
      return
    }

    setSubmitting(true)

    try {
      let finalCategoryId = formCategoryId

      // 1. If inline category creation is selected, create category first
      if (formCategoryId === 'NEW') {
        const catRes = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCategoryName.trim() }),
        })

        if (!catRes.ok) {
          const data = await catRes.json()
          toast.error(data.error || 'Failed to create new category')
          setSubmitting(false)
          return
        }

        const newCat = await catRes.json()
        finalCategoryId = newCat.id
      }

      // 2. Now handle the actual item creation/update
      const url = editingItem ? `/api/menu/${editingItem.id}` : '/api/menu'
      const method = editingItem ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.toUpperCase(),
          price: parseFloat(formPrice),
          categoryId: finalCategoryId,
        }),
      })

      if (res.ok) {
        toast.success(editingItem ? 'Item updated!' : 'Item added!')
        setShowModal(false)
        mutateMenu()
        if (formCategoryId === 'NEW') mutateCats()
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
        mutateMenu()
      } else {
        toast.error('Failed to delete item')
      }
    } catch (err) {
      console.error('Failed to delete item', err)
      toast.error('Failed to delete item')
    }
  }


  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <PageHeader
        title="Menu Management"
        description={`${items.length} items across ${categories.length} categories`}
        action={
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add Item / Category
          </button>
        }
      />

      {/* Search + Category Filter Row */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '0 0 280px' }}>
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--foreground-muted)',
              fontSize: '0.9rem',
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat}
              {cat !== 'All' && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    opacity: 0.6,
                    marginLeft: '0.3rem',
                  }}
                >
                  {categories.find((c) => c.name === cat)?.itemCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Cards */}
      {menuLoading ? (
        <div className="card">
          <p style={{ color: 'var(--foreground-subtle)', padding: '2rem', textAlign: 'center' }}>
            Loading menu...
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground-subtle)' }}
        >
          <p style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</p>
          <p>{searchQuery ? 'No items match your search' : 'No items in this category'}</p>
        </div>
      ) : (
        Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
          <div
            key={categoryName}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {/* Category Section Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '4px',
                    height: '20px',
                    background: 'linear-gradient(to bottom, var(--primary), var(--primary-light))',
                    borderRadius: '2px',
                  }}
                />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--foreground)',
                  }}
                >
                  {categoryName}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--foreground-muted)',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '0.2rem 0.7rem',
                  borderRadius: '9999px',
                  border: '1px solid var(--glass-border)',
                }}
              >
                {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '0.75rem',
              }}
            >
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    e.currentTarget.style.borderColor = 'var(--glass-border)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Top gradient accent */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(90deg, var(--primary), var(--primary-light))',
                      opacity: 0.6,
                      borderRadius: '14px 14px 0 0',
                    }}
                  />

                  {/* Item Name */}
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      color: 'var(--foreground)',
                      lineHeight: 1.3,
                      paddingRight: '0.5rem',
                      minHeight: '2.3em',
                    }}
                  >
                    {item.name}
                  </p>

                  {/* Price */}
                  <p
                    style={{
                      color: 'var(--primary-light)',
                      fontWeight: 800,
                      fontSize: '1.2rem',
                      fontFamily: 'monospace',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {fmtPrice(item.price)}
                  </p>

                  {/* Footer: category badge + actions */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'auto',
                      paddingTop: '0.4rem',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: 'var(--foreground-muted)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.15rem 0.55rem',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.category.name}
                    </span>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
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
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,80,80,0.18)'
                        }}
                        onMouseLeave={(e) => {
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
      {!menuLoading && filteredItems.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.6rem 1.25rem',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)',
            fontSize: '0.8rem',
            color: 'var(--foreground-muted)',
          }}
        >
          <span>
            Showing <strong style={{ color: 'var(--foreground)' }}>{filteredItems.length}</strong>{' '}
            of {items.length} items
            {selectedCategory !== 'All' && (
              <>
                {' '}
                in <strong style={{ color: 'var(--foreground)' }}>{selectedCategory}</strong>
              </>
            )}
            {searchQuery && (
              <>
                {' '}
                matching &quot;<strong style={{ color: 'var(--foreground)' }}>{searchQuery}</strong>
                &quot;
              </>
            )}
          </span>
          <span>
            {Object.keys(groupedItems).length} categor
            {Object.keys(groupedItems).length === 1 ? 'y' : 'ies'}
          </span>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      <Modal
        isOpen={showModal}
        title={editingItem ? '✏️ Edit Item' : '➕ Add Item'}
        onClose={() => setShowModal(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label">Item Name</label>
            <input
              type="text"
              className="form-input"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. PANEER BUTTER MASALA"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Price</label>
            <input
              type="number"
              className="form-input"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
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
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'NEW') setFormCategoryId('NEW');
                else setFormCategoryId(val ? parseInt(val) : '');
              }}
            >
              <option value="">Select category</option>
              <option value="NEW" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>+ Create New Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {formCategoryId === 'NEW' && (
            <div className="form-group animate-fade-in">
              <label className="form-label" style={{ color: 'var(--primary)' }}>New Category Name</label>
              <input
                type="text"
                className="form-input"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value.toUpperCase())}
                placeholder="e.g. BEVERAGES"
                autoFocus
                style={{ borderColor: 'var(--primary)' }}
              />
            </div>
          )}

          <div className="flex gap-3" style={{ marginTop: '0.5rem' }}>
            <button className="btn btn-secondary flex-1" onClick={() => setShowModal(false)}>
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
      </Modal>
    </div>
  )
}
