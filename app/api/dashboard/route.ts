import { NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

export async function GET() {
    try {
        const stats = await getDashboardStats()
        // Transform items to match frontend expectations (menuItem wrapper)
        const result = {
            ...stats,
            recentOrders: stats.recentOrders.map(order => ({
                ...order,
                items: order.items.map(item => ({
                    ...item,
                    menuItem: { name: item.name },
                })),
            })),
        }
        return NextResponse.json(result)
    } catch (error) {
        return handleApiError(error)
    }
}
