// ── Standalone BullMQ Worker Process (TypeScript) ────────────────────────────────
// Run with: ts-node -P tsconfig.node.json worker.ts
// Processes background jobs from Redis queues: invoice-pdf, email, debt-recovery

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { initWhatsApp } from './lib/services/whatsapp';
import { processInvoice } from './lib/worker/processors/invoice';
import { processEmail } from './lib/worker/processors/email';
import { processDebtRecovery } from './lib/worker/processors/debt_recovery';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// ── Initialize Core Services ──────────────────────────────────────────────────
initWhatsApp().catch(e => console.error('❌ WhatsApp Init Failed:', e));

connection.on('connect', () => console.log('🔌 Worker Redis connected'));
connection.on('error', (e) => console.error('❌ Worker Redis error:', e.message));

// ── Invoice PDF Worker ────────────────────────────────────────────────────────
const invoiceWorker = new Worker(
  'invoice-pdf',
  async (job: Job) => {
    console.log(`📄 Processing invoice job ${job.id} — order #${job.data.orderId}`);
    return processInvoice(job.data);
  },
  { connection, concurrency: 3 }
);

// ── Email Worker ──────────────────────────────────────────────────────────────
const emailWorker = new Worker(
  'email',
  async (job: Job) => {
    console.log(`📧 Processing email job ${job.id} — type: ${job.data.type}`);
    return processEmail(job.data);
  },
  { connection, concurrency: 5 }
);

// ── Debt Recovery Worker ──────────────────────────────────────────────────────
const debtRecoveryWorker = new Worker(
  'debt-recovery',
  async (job: Job) => {
    console.log(`💸 Processing debt recovery job ${job.id}`);
    return processDebtRecovery();
  },
  { connection, concurrency: 1 }
);

// ── Error / Completion handlers ───────────────────────────────────────────────
const workers = [invoiceWorker, emailWorker, debtRecoveryWorker];

for (const worker of workers) {
  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} [${job.name}] completed`);
  });
  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} [${job?.name}] failed:`, err.message);
  });
}

console.log('\n🚀 NEXUS Worker Engine Started');
console.log('📋 Listening on queues: invoice-pdf, email, debt-recovery\n');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down workers...');
  await Promise.all(workers.map(w => w.close()));
  process.exit(0);
});
