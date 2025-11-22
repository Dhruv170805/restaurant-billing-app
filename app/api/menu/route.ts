import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
    try {
        const items = await prisma.menuItem.findMany({
            include: { category: true },
            orderBy: { categoryId: 'asc' }
        })
        return NextResponse.json(items)
    } catch (error) {
        return NextResponse.json({ error: 'Error fetching menu items' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, price, categoryName } = body

        // Find or create category
        let category = await prisma.category.findFirst({
            where: { name: categoryName }
        })

        if (!category) {
            category = await prisma.category.create({
                data: { name: categoryName }
            })
        }

        const item = await prisma.menuItem.create({
            data: {
                name,
                price: parseFloat(price),
                categoryId: category.id
            }
        })

        return NextResponse.json(item)
    } catch (error) {
        return NextResponse.json({ error: 'Error creating menu item' }, { status: 500 })
    }
}
