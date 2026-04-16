import { Module } from '@nestjs/common';
import { ImpersonationController } from './impersonation.controller';
import { ImpersonationService } from './impersonation.service';

/**
 * SuperAdmin Impersonation Domain.
 * Manages the high-privilege secure identity assumption logic.
 */
@Module({
  controllers: [ImpersonationController],
  providers: [ImpersonationService],
})
export class ImpersonationModule {}
