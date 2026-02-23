import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getMenuItems, addMenuItem } from '@/lib/db'
import { handleApiError, ValidationError } from '@/lib/errors'
import {
  validateStringLength,
  validatePositiveNumber,
  validatePositiveInteger,
} from '@/lib/validation'

export async function GET() {
  try {
    const items = await getMenuItems()
    return NextResponse.json(items)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const name = validateStringLength(body.name, 'Item name', 1, 100)
    const price = validatePositiveNumber(body.price, 'Price')
    const categoryId = validatePositiveInteger(body.categoryId, 'Category ID')

    // Round price to 2 decimal places
    const roundedPrice = Math.round(price * 100) / 100

    const item = await addMenuItem(name, roundedPrice, categoryId)
    if (!item) {
      throw new ValidationError('Invalid category ID — category does not exist', { categoryId })
    }

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
