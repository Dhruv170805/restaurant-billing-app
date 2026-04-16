import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getCategories, addCategory, updateCategory, deleteCategory } from '@/lib/db'
import { handleApiError, ValidationError } from '@/lib/errors'
import { validateStringLength, validatePositiveInteger } from '@/lib/validation'

import { requireAuth } from '@/lib/middleware/auth'

export const GET = requireAuth(async (req, { tenant }) => {
  try {
    const categories = await getCategories(tenant.slug)
    return NextResponse.json(categories)
  } catch (error) {
    return handleApiError(error)
  }
})

export const POST = requireAuth(async (req, { tenant }) => {
  try {
    const body = await req.json()

    const name = validateStringLength(body.name, 'Category name', 1, 50).toUpperCase()

    // Check for duplicates
    const existing = (await getCategories(tenant.slug)).find((c) => c.name === name)
    if (existing) {
      throw new ValidationError(`Category "${name}" already exists`, { existingId: existing.id })
    }

    const category = await addCategory(tenant.slug, name)
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
})

export const PUT = requireAuth(async (req, { tenant }) => {
  try {
    const body = await req.json()

    const id = validatePositiveInteger(body.id, 'Category ID')
    const name = validateStringLength(body.name, 'Category name', 1, 50).toUpperCase()

    // Check for duplicates (excluding current category)
    const existing = (await getCategories(tenant.slug)).find((c) => c.name === name && c.id !== id)
    if (existing) {
      throw new ValidationError(`Category "${name}" already exists`, { existingId: existing.id })
    }

    const updated = await updateCategory(tenant.slug, id, name)
    if (!updated) {
      throw new ValidationError('Category not found', { id })
    }

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error)
  }
})

export const DELETE = requireAuth(async (req, { tenant }) => {
  try {
    const { searchParams } = new URL(req.url)
    const idParam = searchParams.get('id')

    if (!idParam) {
      throw new ValidationError('Category ID is required as a query parameter')
    }

    const id = parseInt(idParam)
    if (isNaN(id) || id < 1) {
      throw new ValidationError('Category ID must be a positive integer')
    }

    const deleted = await deleteCategory(tenant.slug, id)
    if (!deleted) {
      throw new ValidationError(
        'Cannot delete: category has menu items or does not exist. Remove all items from this category first.',
        { categoryId: id }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
})
