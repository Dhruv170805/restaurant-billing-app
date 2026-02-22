import { NextResponse } from 'next/server'
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
    const result = items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: { id: item.categoryId, name: item.category },
    }))
    return NextResponse.json(result)
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

    return NextResponse.json(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        category: { id: item.categoryId, name: item.category },
      },
      { status: 201 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
