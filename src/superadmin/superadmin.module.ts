import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { BillingModule } from './billing/billing.module';
import { ImpersonationModule } from './impersonation/impersonation.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';

/**
 * SuperAdmin Namespace Module.
 * Consolidates all platform-level control domains into a single high-privilege context.
 */
@Module({
  imports: [
    AuthModule,
    TenantsModule,
    BillingModule,
    ImpersonationModule,
    AnalyticsModule,
    FeatureFlagsModule,
  ],
})
export class SuperAdminModule {}
