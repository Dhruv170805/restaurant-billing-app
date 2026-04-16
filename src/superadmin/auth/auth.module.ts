import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TotpService } from './totp.service';

/**
 * SuperAdmin Auth Domain.
 * Orchestrates identity verification, 2FA handshakes, and platform credentials.
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, TotpService],
  exports: [AuthService], // Exported for use in guards
})
export class AuthModule {}
