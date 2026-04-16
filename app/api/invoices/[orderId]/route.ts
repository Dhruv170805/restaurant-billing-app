import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getDb } from '@/lib/db/mongo'
import { getFileStream, fileExists, storageKeys } from '@/lib/storage'
import { DbOrder } from '@/lib/db/schema'
import { invoiceQueue } from '@/lib/worker/queues'
import { extractIntParam } from '@/lib/params'

// ── GET /api/invoices/[orderId] — stream PDF ───────────────────────────────────
export const GET = requireAuth(async (req, { user, tenant }, params) => {
  const orderId = extractIntParam(params?.orderId)
  if (!orderId || isNaN(orderId)) return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })

  const db = await getDb()
  const order = await db.collection<DbOrder>('orders').findOne({ _id: orderId, tenantId: tenant.slug })
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const key = storageKeys.invoice(tenant.slug, orderId)
  const exists = await fileExists(key).catch(() => false)

  if (!exists) {
    // Enqueue generation if not yet available
    await invoiceQueue.add('generate', { orderId, tenantId: tenant.slug })
    return NextResponse.json(
      { message: 'Invoice is being generated. Try again in a few seconds.' },
      { status: 202 }
    )
  }

  // Stream PDF from MinIO
  const stream = await getFileStream(key)
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${orderId}.pdf"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=3600',
    },
  })
})
