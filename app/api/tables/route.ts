import { NextResponse } from 'next/server'
import { getTables } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

export async function GET() {
  try {
    const tables = await getTables()

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
