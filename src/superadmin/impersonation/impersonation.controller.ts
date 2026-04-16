import { Controller, Post, Body, Res, UseGuards, UseInterceptors, Req, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { SuperAdminJwtGuard } from '../../common/guards/superadmin-jwt.guard';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { ImpersonationService } from './impersonation.service';

/**
 * SuperAdmin Impersonation Controller.
 * Allows verified executives to securely enter a tenant's environment.
 * Protected by mandatory 2FA security guard and immutable audit interceptor.
 */
@Controller('superadmin/impersonate')
@UseGuards(SuperAdminJwtGuard)
@UseInterceptors(AuditLogInterceptor)
export class ImpersonationController {
  constructor(private readonly impersonationService: ImpersonationService) {}

  @Post()
  async impersonate(@Req() req: any, @Body() body: any, @Res() res: Response) {
    const { tenantId, targetEmail } = body;
    const superAdminId = req.superAdmin.sub;

    const result = await this.impersonationService.startImpersonation(
      superAdminId,
      tenantId,
      targetEmail
    );

    // Set the tenant access_token cookie
    res.cookie('access_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return res.status(HttpStatus.OK).json({ status: 'SUCCESS' });
  }
}
