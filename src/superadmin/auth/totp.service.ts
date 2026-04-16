import { Injectable } from '@nestjs/common';
import * as OTPAuth from 'otpauth';

/**
 * TOTP Service for Executive Multi-Factor Authentication.
 * Manages the platform owner's cryptographic 2FA challenges.
 */
@Injectable()
export class TotpService {
  /**
   * Verifies a TOTP code against a secret.
   */
  async verifyCode(secret: string, code: string): Promise<boolean> {
    const totp = new OTPAuth.TOTP({
      issuer: 'NEXUS',
      label: 'HQ Control',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });

    return totp.validate({ token: code, window: 1 }) !== null;
  }
}
