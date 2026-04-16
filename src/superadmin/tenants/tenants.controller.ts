import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, HttpStatus, HttpCode } from '@nestjs/common';
import { SuperAdminJwtGuard } from '../../common/guards/superadmin-jwt.guard';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { TenantsService } from './tenants.service';

/**
 * SuperAdmin Tenants Controller.
 * Manages the global multi-tenant fleet registry.
 * Guarded by 2FA-secured identity validation and immutable Audit Interceptor.
 */
@Controller('superadmin/tenants')
@UseGuards(SuperAdminJwtGuard)
@UseInterceptors(AuditLogInterceptor)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  async listAll() {
    return this.tenantsService.listAll();
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(@Param('id') id: string) {
    return this.tenantsService.updateSuspension(id, true);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    return this.tenantsService.updateSuspension(id, false);
  }
}
