import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { SuperAdminJwtGuard } from '../../common/guards/superadmin-jwt.guard';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { FlagsService } from './flags.service';

/**
 * SuperAdmin Feature Flags Controller.
 * Manages granular capability toggles for the multi-tenant fleet.
 * Guarded by 2FA-secured identity validation and immutable Audit Interceptor.
 */
@Controller('superadmin/flags')
@UseGuards(SuperAdminJwtGuard)
@UseInterceptors(AuditLogInterceptor)
export class FlagsController {
  constructor(private readonly flagsService: FlagsService) {}

  @Get(':tenantId')
  async getFlags(@Param('tenantId') tenantId: string) {
    return this.flagsService.getFlags(tenantId);
  }

  @Post(':tenantId/toggle')
  async toggle(@Param('tenantId') tenantId: string, @Body() body: any) {
    const { flag, enabled } = body;
    return this.flagsService.toggleFeature(tenantId, flag, enabled);
  }
}
