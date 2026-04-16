import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

/**
 * SuperAdmin Tenants Domain.
 * Manages the global multi-tenant registry and platform-level lifecycle (Suspend/Activate).
 */
@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
