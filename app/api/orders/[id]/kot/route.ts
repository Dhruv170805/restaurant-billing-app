import { requireAuth } from '@/lib/middleware/auth'
import { handleApiError } from '@/lib/errors'
import { NextResponse } from 'next/server'
import { markKOTPrinted } from '@/lib/db'

export const PUT = requireAuth(async (req, { tenant }, params) => {
    try {
        const id = parseInt(params!.id as string, 10)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const updatedOrder = await markKOTPrinted(tenant.slug, id)
        if (!updatedOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

        return NextResponse.json(updatedOrder)
    } catch (error) {
        return handleApiError(error)
    }
})
