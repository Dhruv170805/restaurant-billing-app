import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getFileStream, fileExists } from '@/lib/storage'
import { extractParam } from '@/lib/params'

// ── GET /api/storage/[...path] — serve MinIO files via app ───────────────────
// Used for: logos, reports, exports (invoices have their own route)
export const GET = requireAuth(async (req, { tenant }, params) => {
  const rawPath = params?.path
  // path param is string[] from catch-all route [...path]
  const key = Array.isArray(rawPath)
    ? rawPath.join('/')
    : (extractParam(rawPath) ?? '')

  if (!key) return NextResponse.json({ error: 'No path specified' }, { status: 400 })

  // Security: only allow access to tenant's own files
  if (!key.startsWith(`logos/${tenant.slug}/`) &&
      !key.startsWith(`reports/${tenant.slug}/`) &&
      !key.startsWith(`exports/${tenant.slug}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const exists = await fileExists(key).catch(() => false)
  if (!exists) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  const stream = await getFileStream(key)
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)

  const ext = key.split('.').pop() ?? ''
  const contentType: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', svg: 'image/svg+xml', csv: 'text/csv',
    pdf: 'application/pdf', zip: 'application/zip',
  }

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType[ext] ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  })
})
