import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getOrder, updateOrderStatus, deleteOrder } from '@/lib/db'
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors'
import {
  validateEnum,
  validateOrderStatusTransition,
  validateOptionalStringLength,
} from '@/lib/validation'

import { requireAuth } from '@/lib/middleware/auth'

export const GET = requireAuth(async (req, { tenant }, params) => {
  try {
    const { id } = params!
    const orderId = parseInt(id as string)
    if (isNaN(orderId) || orderId < 1) {
      throw new ValidationError('Invalid order ID')
    }

    const order = await getOrder(orderId, tenant.slug)
    if (!order) {
      throw new NotFoundError('Order', orderId)
    }

    return NextResponse.json(order)
  } catch (error) {
    return handleApiError(error)
  }
})

export const PUT = requireAuth(async (req, { tenant }, params) => {
  try {
    const { id } = params!
    const orderId = parseInt(id as string)
    if (isNaN(orderId) || orderId < 1) {
      throw new ValidationError('Invalid order ID')
    }

    const body = await req.json()
    const newStatus = validateEnum(
      body.status,
      ['PENDING', 'PAID', 'UNPAID', 'CANCELLED'] as const,
      'status'
    )

    let paymentMethod: 'CASH' | 'ONLINE' | 'UNPAID' | undefined
    if (body.paymentMethod) {
      paymentMethod = validateEnum(
        body.paymentMethod,
        ['CASH', 'ONLINE', 'UNPAID'] as const,
        'paymentMethod'
      )
    }

    const customerName = validateOptionalStringLength(body.customerName, 'Customer Name', 2, 100)
    const customerPhone = validateOptionalStringLength(body.customerPhone, 'Customer Phone', 5, 20)

    // Check current order exists and validate state transition
    const currentOrder = await getOrder(orderId, tenant.slug)
    if (!currentOrder) {
      throw new NotFoundError('Order', orderId)
    }

    // Enforce valid state transitions (e.g., CANCELLED → PAID is not allowed)
    validateOrderStatusTransition(currentOrder.status, newStatus)

    const order = await updateOrderStatus(tenant.slug, orderId, newStatus, paymentMethod, {
      customerName,
      customerPhone,
    })
    if (!order) {
      throw new NotFoundError('Order', orderId)
    }

    return NextResponse.json(order)
  } catch (error) {
    return handleApiError(error)
  }
})

export const DELETE = requireAuth(async (req, { tenant }, params) => {
  try {
    const { id } = params!
    const orderId = parseInt(id as string)
    if (isNaN(orderId) || orderId < 1) {
      throw new ValidationError('Invalid order ID')
    }

    const deleted = await deleteOrder(tenant.slug, orderId)
    if (!deleted) {
      throw new NotFoundError('Order', orderId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
})
