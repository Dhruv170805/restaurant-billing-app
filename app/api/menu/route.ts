import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { listPgMenuItems, createPgMenuItem } from '@/lib/db/postgres_menu'
import { handleApiError, ValidationError } from '@/lib/errors'
import {
  validateStringLength,
  validatePositiveNumber,
  validatePositiveInteger,
} from '@/lib/validation'

import { requireAuth } from '@/lib/middleware/auth'

export const GET = requireAuth(async (req, { tenant }) => {
  try {
    const items = await listPgMenuItems(tenant.id)
    return NextResponse.json(items)
  } catch (error) {
    return handleApiError(error)
  }
})

export const POST = requireAuth(async (req, { tenant }) => {
  try {
    const body = await req.json()

    const name = validateStringLength(body.name, 'Item name', 1, 100)
    const price = validatePositiveNumber(body.price, 'Price')
    const categoryId = validatePositiveInteger(body.categoryId, 'Category ID')

    // Round price to 2 decimal places
    const roundedPrice = Math.round(price * 100) / 100

    const item = await createPgMenuItem({
      tenantId: tenant.id,
      name,
      price: roundedPrice,
      categoryId
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
})
