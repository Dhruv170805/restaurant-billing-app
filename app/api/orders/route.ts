import { NextResponse } from 'next/server'
import {
  listPgOrders,
  createPgOrder,
  addItemsToPgOrder,
} from '@/lib/db/postgres_orders'
import { getMenuItem } from '@/lib/db/menu'
import { handleApiError } from '@/lib/errors'
import { ValidationError } from '@/lib/errors'
import { validatePositiveInteger, validateOptionalStringLength } from '@/lib/validation'
import { requireAuth } from '@/lib/middleware/auth'

export const GET = requireAuth(async (req, { tenant }) => {
  try {
    const { searchParams } = new URL(req.url)
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')

    if (page || limit) {
      const p = page ? parseInt(page) : 1
      const l = limit ? parseInt(limit) : 50
      if (isNaN(p) || p < 1) throw new ValidationError('page must be a positive integer')
      const result = await listPgOrders(tenant.id, l, (p - 1) * l)
      return NextResponse.json({ orders: result, page: p, limit: l })
    }

    const orders = await listPgOrders(tenant.id)
    return NextResponse.json(orders)
  } catch (error) {
    return handleApiError(error)
  }
})

export const POST = requireAuth(async (req, { tenant }) => {
  try {
    const body = await req.json()
    const { items, tableNumber, orderId } = body

    const customerName = validateOptionalStringLength(body.customerName, 'Customer Name', 2, 100)
    const customerPhone = validateOptionalStringLength(body.customerPhone, 'Customer Phone', 5, 20)

    // Validate table number
    const validTable = validatePositiveInteger(tableNumber, 'Table number')

    // Map input items
    const validatedItems = Array.isArray(items) ? items : []

    // Verify each item exists in the menu
    for (const item of validatedItems) {
      const menuItem = await getMenuItem(tenant.slug, item.id)
      if (!menuItem) {
        throw new ValidationError(`Menu item #${item.id} does not exist`, { itemId: item.id })
      }
    }

    const orderItems = validatedItems.map((item) => ({
      menuItemId: item.id,
      quantity: item.quantity,
    }))

    if (orderId) {
      const updatedOrder = await addItemsToPgOrder(tenant.id, orderId, orderItems)
      return NextResponse.json(updatedOrder, { status: 200 })
    } else {
      // Create a new order
      const order = await createPgOrder({
        tenantId: tenant.id,
        items: orderItems,
        tableNumber: validTable,
        customerName,
        customerPhone
      })
      return NextResponse.json(order, { status: 201 })
    }
  } catch (error) {
    return handleApiError(error)
  }
})
