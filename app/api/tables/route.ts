import { NextResponse } from 'next/server'
import { getActiveTableOrders, getSettings } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

export async function GET() {
  try {
    const settings = await getSettings()
    const activeOrders = await getActiveTableOrders()
    const tables = []

    for (let i = 1; i <= settings.tableCount; i++) {
      const order = activeOrders.get(i)
      tables.push({
        number: i,
        status: order ? 'occupied' : 'available',
        order: order
          ? {
              id: order.id,
              tokenNumber: order.tokenNumber,
              total: order.total,
              itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
              createdAt: order.createdAt,
            }
          : null,
      })
    }

    // Prevent caching — table status must always be fresh
    return new NextResponse(JSON.stringify(tables), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
