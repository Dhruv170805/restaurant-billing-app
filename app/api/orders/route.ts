import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { items, total } = body

        const order = await prisma.order.create({
            data: {
                total,
                status: 'PAID',
                items: {
                    create: items.map((item: any) => ({
                        menuItemId: item.id,
                        quantity: item.quantity,
                        priceAtOrder: item.price
                    }))
                }
            }
        })

        return NextResponse.json(order)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Error creating order' }, { status: 500 })
    }
}

export async function GET() {
    try {
        const orders = await prisma.order.findMany({
            include: {
                items: {
                    include: { menuItem: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(orders)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching orders' }, { status: 500 })
    }
}
