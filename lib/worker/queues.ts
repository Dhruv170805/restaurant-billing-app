// ── BullMQ Queue Definitions ──────────────────────────────────────────────────
// Run in worker.js (separate process from Next.js app server)
// All queues share the same Redis connection

import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

// Shared Redis connection for BullMQ (separate from app cache)
export const workerRedis = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
})

const queueOpts = { connection: workerRedis }

// ── Queues ────────────────────────────────────────────────────────────────────

/** Generate PDF invoice and upload to MinIO */
export const invoiceQueue = new Queue<InvoiceJobData>('invoice-pdf', queueOpts)

/** Send transactional emails via Nodemailer */
export const emailQueue = new Queue<EmailJobData>('email', queueOpts)

/** Generate CSV/XLSX reports */
export const reportQueue = new Queue<ReportJobData>('report-export', queueOpts)

/** GDPR data export — zip tenant data and email a download link */
export const exportQueue = new Queue<ExportJobData>('data-export', queueOpts)

/** Scheduled Debt Recovery (unpaid bills > 7 days) */
export const debtRecoveryQueue = new Queue('debt-recovery', queueOpts)

// ── Job Data Types ────────────────────────────────────────────────────────────

export interface InvoiceJobData {
  orderId: number
  tenantId: string
}

export interface EmailJobData {
  to: string
  subject: string
  html: string
  text?: string
}

export interface ReportJobData {
  tenantId: string
  from: string // ISO date
  to: string   // ISO date
  format: 'csv' | 'xlsx'
  requestedByUserId: string
}

export interface ExportJobData {
  tenantId: string
  requestedByUserId: string
  requestedByEmail: string
}
