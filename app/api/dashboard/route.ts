import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getPgDashboardStats } from '@/lib/db/postgres_orders'
import { handleApiError } from '@/lib/errors'
import { requireAuth } from '@/lib/middleware/auth'

export const GET = requireAuth(async (req, { tenant }) => {
  try {
    const stats = await getPgDashboardStats(tenant.id)
    return NextResponse.json(stats)
  } catch (error) {
    return handleApiError(error)
  }
})
