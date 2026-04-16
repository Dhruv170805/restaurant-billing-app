import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { verifySuperToken } from '@/lib/super_auth';
import { query } from '@/lib/db/postgres';

/**
 * SuperAdmin JWT Guard.
 * Enforces platform-level session verification and mandatory 2FA check.
 * This guard ensures that high-privilege operations are only accessible via verified HQ sessions.
 */
@Injectable()
export class SuperAdminJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Extract token from cookies or authorization header
    const token = request.cookies?.super_token || 
                  request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Missing SuperAdmin identity token');
    }

    try {
      // 2. Cryptographic verification using the established lib/super_auth engine
      const payload = await verifySuperToken(token);
      
      // Mandatory 2FA Check for Control Plane access
      if (!payload.is2faVerified) {
        throw new UnauthorizedException('2FA verification required for this operation');
      }

      // 3. Attach session to request for downstream consumption
      request.superAdmin = payload;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired SuperAdmin session');
    }
  }
}
