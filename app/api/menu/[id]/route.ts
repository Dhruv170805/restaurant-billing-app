import { NextResponse } from 'next/server'
import { getMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/db'
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors'
import {
  validateStringLength,
  validatePositiveNumber,
  validatePositiveInteger,
} from '@/lib/validation'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const itemId = parseInt(id)
    if (isNaN(itemId) || itemId < 1) {
      throw new ValidationError('Invalid menu item ID')
    }

    const item = await getMenuItem(itemId)
    if (!item) {
      throw new NotFoundError('Menu item', itemId)
    }

    return NextResponse.json({
      ...item,
      category: { id: item.categoryId, name: item.category },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const itemId = parseInt(id)
    if (isNaN(itemId) || itemId < 1) {
      throw new ValidationError('Invalid menu item ID')
    }

    const body = await request.json()
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

    const updated = await updateMenuItem(itemId, updates)
    if (!updated) {
      throw new NotFoundError('Menu item', itemId)
    }

    return NextResponse.json({
      ...updated,
      category: { id: updated.categoryId, name: updated.category },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const itemId = parseInt(id)
    if (isNaN(itemId) || itemId < 1) {
      throw new ValidationError('Invalid menu item ID')
    }

    const deleted = await deleteMenuItem(itemId)
    if (!deleted) {
      throw new NotFoundError('Menu item', itemId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
