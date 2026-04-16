import { query } from '../../db/postgres';
import { sendWhatsAppMessage } from '../../services/whatsapp';
import { logger } from '../../logger';

/**
 * BullMQ Processor: Daily Automated Debt Recovery.
 * Scans the relational store for unpaid orders that are precisely 7 days old
 * and dispatches a polite WhatsApp reminder to the customer.
 */
export async function processDebtRecovery() {
  logger.info('💸 Starting daily debt recovery scan...');

  try {
    // 1. Find UNPAID orders from 7 days ago
    // We look for orders created between 7.5 and 6.5 days ago to ensure we catch them once
    const sql = `
      SELECT o.*, t.name as restaurant_name 
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      WHERE o.status = 'UNPAID' 
        AND o.customer_phone IS NOT NULL
        AND o.created_at >= NOW() - INTERVAL '8 days'
        AND o.created_at <= NOW() - INTERVAL '7 days'
    `;
    
    // Using 'SYSTEM' tenant context for global scan (bypasses RLS)
    const pendingDebts = await query<any>('SYSTEM', sql);

    logger.info(`🔍 Found ${pendingDebts.length} pending debts to recover`);

    for (const debt of pendingDebts) {
      const message = `Namaste! This is a gentle reminder from *${debt.restaurant_name}* regarding your unpaid bill of ${debt.total} from ${new Date(debt.created_at).toLocaleDateString()}. You can clear this at your earliest convenience. Thank you!`;
      
      try {
        await sendWhatsAppMessage(debt.customer_phone, message);
        logger.info(`✅ Reminder sent to ${debt.customer_phone} for order #${debt.id}`);
      } catch (err) {
        logger.error(`❌ Failed to send reminder to ${debt.customer_phone}`, err);
      }
    }

    return { processed: pendingDebts.length };
  } catch (err: any) {
    logger.error('❌ Debt recovery processor failed', err);
    throw err;
  }
}
