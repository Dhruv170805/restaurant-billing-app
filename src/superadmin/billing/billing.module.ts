import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PlansController } from './plans.controller';
import { BillingService } from './billing.service';

/**
 * SuperAdmin Billing Domain.
 * Manages the platform's revenue lifecycle, pricing tiers, and manual payment verification.
 */
@Module({
  controllers: [PaymentsController, PlansController],
  providers: [BillingService],
})
export class BillingModule {}
