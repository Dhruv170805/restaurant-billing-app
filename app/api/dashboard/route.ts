import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getDashboardStats } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

export async function GET() {
  try {
    const stats = await getDashboardStats()
    return NextResponse.json(stats)
  } catch (error) {
    return handleApiError(error)
  }
}
