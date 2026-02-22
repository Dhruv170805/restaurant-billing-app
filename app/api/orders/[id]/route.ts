import { NextResponse } from 'next/server'
import { getOrder, updateOrderStatus, deleteOrder } from '@/lib/db'
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors'
import { validateEnum, validateOrderStatusTransition } from '@/lib/validation'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const orderId = parseInt(id)
        if (isNaN(orderId) || orderId < 1) {
            throw new ValidationError('Invalid order ID')
        }

        const order = await getOrder(orderId)
        if (!order) {
            throw new NotFoundError('Order', orderId)
        }

        // Transform to match frontend expectations
        return NextResponse.json({
            ...order,
            items: order.items.map(item => ({
                id: item.menuItemId,
                quantity: item.quantity,
                priceAtOrder: item.price,
                menuItem: { name: item.name },
            })),
        })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const orderId = parseInt(id)
        if (isNaN(orderId) || orderId < 1) {
            throw new ValidationError('Invalid order ID')
        }

        const body = await request.json()
        const newStatus = validateEnum(body.status, ['PENDING', 'PAID', 'CANCELLED'] as const, 'status')

        let paymentMethod: 'CASH' | 'ONLINE' | undefined
        if (body.paymentMethod) {
            paymentMethod = validateEnum(body.paymentMethod, ['CASH', 'ONLINE'] as const, 'paymentMethod')
        }

        // Check current order exists and validate state transition
        const currentOrder = await getOrder(orderId)
        if (!currentOrder) {
            throw new NotFoundError('Order', orderId)
        }

        // Enforce valid state transitions (e.g., CANCELLED → PAID is not allowed)
        validateOrderStatusTransition(currentOrder.status, newStatus)

        const order = await updateOrderStatus(orderId, newStatus, paymentMethod)
        if (!order) {
            throw new NotFoundError('Order', orderId)
        }

        return NextResponse.json({
            ...order,
            items: order.items.map(item => ({
                id: item.menuItemId,
                quantity: item.quantity,
                priceAtOrder: item.price,
                menuItem: { name: item.name },
            })),
        })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const orderId = parseInt(id)
        if (isNaN(orderId) || orderId < 1) {
            throw new ValidationError('Invalid order ID')
        }

        const deleted = await deleteOrder(orderId)
        if (!deleted) {
            throw new NotFoundError('Order', orderId)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return handleApiError(error)
    }
}
