import { Module } from '@nestjs/common';
import { FlagsController } from './flags.controller';
import { FlagsService } from './flags.service';

/**
 * SuperAdmin Feature Flags Domain.
 * Manages the granular capability toggles across the multi-tenant fleet.
 */
@Module({
  controllers: [FlagsController],
  providers: [FlagsService],
})
export class FeatureFlagsModule {}
