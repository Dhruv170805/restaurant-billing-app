import { NextResponse } from 'next/server'
import { markKOTPrinted } from '@/lib/db/orders'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const id = parseInt(resolvedParams.id, 10)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const updatedOrder = await markKOTPrinted(id)
        if (!updatedOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

        return NextResponse.json(updatedOrder)
    } catch (error) {
        console.error('Failed to mark KOT printed:', error)
        return NextResponse.json({ error: 'Failed to update KOT status' }, { status: 500 })
    }
}
