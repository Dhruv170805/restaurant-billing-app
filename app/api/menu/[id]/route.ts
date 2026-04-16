import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/db'
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors'
import {
  validateStringLength,
  validatePositiveNumber,
  validatePositiveInteger,
} from '@/lib/validation'

import { requireAuth } from '@/lib/middleware/auth'

export const GET = requireAuth(async (req, { tenant }, params) => {
  try {
    const { id } = params!
    const itemId = parseInt(id as string)
    if (isNaN(itemId) || itemId < 1) {
      throw new ValidationError('Invalid menu item ID')
    }

    const item = await getMenuItem(tenant.slug, itemId)
    if (!item) {
      throw new NotFoundError('Menu item', itemId)
    }

    return NextResponse.json(item)
  } catch (error) {
    return handleApiError(error)
  }
})

export const PUT = requireAuth(async (req, { tenant }, params) => {
  try {
    const { id } = params!
    const itemId = parseInt(id as string)
    if (isNaN(itemId) || itemId < 1) {
      throw new ValidationError('Invalid menu item ID')
    }

    const body = await req.json()
    const updates: { name?: string; price?: number; categoryId?: number } = {}

    if (body.name !== undefined) {
      updates.name = validateStringLength(body.name, 'Item name', 1, 100)
    }
    if (body.price !== undefined) {
      updates.price = Math.round(validatePositiveNumber(body.price, 'Price') * 100) / 100
    }
    if (body.categoryId !== undefined) {
      updates.categoryId = validatePositiveInteger(body.categoryId, 'Category ID')
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('At least one field (name, price, categoryId) must be provided')
    }

    const updated = await updateMenuItem(tenant.slug, itemId, updates)
    if (!updated) {
      throw new NotFoundError('Menu item', itemId)
    }

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error)
  }
})

export const DELETE = requireAuth(async (req, { tenant }, params) => {
  try {
    const { id } = params!
    const itemId = parseInt(id as string)
    if (isNaN(itemId) || itemId < 1) {
      throw new ValidationError('Invalid menu item ID')
    }

    const deleted = await deleteMenuItem(tenant.slug, itemId)
    if (!deleted) {
      throw new NotFoundError('Menu item', itemId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
})
