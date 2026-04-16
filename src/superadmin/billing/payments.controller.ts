import { Controller, Post, Get, Body, UseGuards, UseInterceptors, Req, HttpStatus, HttpCode } from '@nestjs/common';
import { SuperAdminJwtGuard } from '../../common/guards/superadmin-jwt.guard';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { BillingService } from './billing.service';

/**
 * SuperAdmin Payments Controller.
 * Manages the manual UPI verification queue.
 * Guarded by 2FA-secured JWT and immutable Audit Interceptor.
 */
@Controller('superadmin/payments')
@UseGuards(SuperAdminJwtGuard)
@UseInterceptors(AuditLogInterceptor)
export class PaymentsController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  async getPending() {
    return this.billingService.getPendingPayments();
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Req() req: any, @Body() body: any) {
    const { requestId, status, notes } = body;
    const superAdminId = req.superAdmin.sub;

    return this.billingService.verifyPayment(
      requestId,
      status,
      superAdminId,
      notes
    );
  }
}
