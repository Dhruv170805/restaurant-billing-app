import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/middleware/auth'
import { getAuditLogs } from '@/lib/audit'

// ── GET /api/admin/audit — superadmin audit log viewer ────────────────────────
export const GET = requireSuperAdmin(async (req, { user }) => {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId') ?? undefined
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)

  const logs = await getAuditLogs(tenantId, limit)
  return NextResponse.json({ logs, count: logs.length })
})
