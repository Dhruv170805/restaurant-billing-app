import { Controller, Get, UseGuards } from '@nestjs/common';
import { SuperAdminJwtGuard } from '../../common/guards/superadmin-jwt.guard';

/**
 * SuperAdmin Plans Controller.
 * Manages the global SaaS pricing tiers and platform capabilities.
 * Guarded by mandatory 2FA security validation.
 */
@Controller('superadmin/plans')
@UseGuards(SuperAdminJwtGuard)
export class PlansController {
  
  @Get()
  async listAll() {
    // Return the hardcoded elite pricing tiers for now
    return [
      { id: 'free', name: 'Free Tier', price: 0, features: ['Basic POS', '1 Staff'] },
      { id: 'pro', name: 'Pro Tier', price: 29, features: ['Advanced Analytics', 'Unlimited Staff', 'WhatsApp Integration'] },
      { id: 'enterprise', name: 'Enterprise', price: 99, features: ['KDS', 'Multi-Store', 'Dedicated Support'] }
    ];
  }
}
