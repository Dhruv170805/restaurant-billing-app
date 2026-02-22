import { NextResponse } from 'next/server'
import { getOrders, getOrdersPaginated, createOrder, getMenuItem, getOrder, addItemsToOrder } from '@/lib/db'
import { handleApiError } from '@/lib/errors'
import { ValidationError } from '@/lib/errors'
import { validateOrderItems, validatePositiveInteger } from '@/lib/validation'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const page = searchParams.get('page')
        const limit = searchParams.get('limit')

        if (page || limit) {
            const p = page ? parseInt(page) : 1
            const l = limit ? parseInt(limit) : 20
            if (isNaN(p) || p < 1) throw new ValidationError('page must be a positive integer')
            if (isNaN(l) || l < 1 || l > 100) throw new ValidationError('limit must be between 1 and 100')
            const result = await getOrdersPaginated(p, l)
            return NextResponse.json(result)
        }

        const orders = await getOrders()
        // Transform to match frontend expectations
        const result = orders.map(order => ({
            ...order,
            items: order.items.map(item => ({
                ...item,
                menuItem: { name: item.name },
            })),
        }))
        return NextResponse.json(result)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { items, tableNumber, orderId } = body

        // Validate table number
        const validTable = validatePositiveInteger(tableNumber, 'Table number')

        // Validate and sanitize items
        const validatedItems = validateOrderItems(items)

        // Verify each item exists in the menu
        for (const item of validatedItems) {
            const menuItem = await getMenuItem(item.id)
            if (!menuItem) {
                throw new ValidationError(`Menu item #${item.id} does not exist`, { itemId: item.id })
            }
        }

        const orderItems = validatedItems.map(item => ({
            menuItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
        }))

        // Total is recalculated server-side — client total ignored
        const clientTotal = body.total || 0

        if (orderId) {
            // Append items to existing order
            const existingOrder = await getOrder(orderId)
            if (!existingOrder) {
                throw new ValidationError('Order not found', { orderId })
            }
            if (existingOrder.status !== 'PENDING') {
                throw new ValidationError('Can only add items to an active order', { status: existingOrder.status })
            }
            const updatedOrder = await addItemsToOrder(orderId, orderItems)
            return NextResponse.json(updatedOrder, { status: 200 })
        } else {
            // Create a new order
            const order = await createOrder(orderItems, clientTotal, validTable)
            return NextResponse.json(order, { status: 201 })
        }
    } catch (error) {
        return handleApiError(error)
    }
}
