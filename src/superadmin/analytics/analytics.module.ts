import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';

/**
 * SuperAdmin Analytics Domain.
 * Manages platform-wide financial statistics, tenant growth, and system pulse.
 */
@Module({
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
