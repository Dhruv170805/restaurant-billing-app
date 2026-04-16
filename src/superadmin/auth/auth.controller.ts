import { Controller, Post, Body, Res, UnauthorizedException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

/**
 * SuperAdmin Auth Controller.
 * Entry point for platform owner identity management at hq.nexuspos.local.
 */
@Controller('superadmin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any, @Res() res: Response) {
    const { email, password } = body;
    
    try {
      const result = await this.authService.login(email, password);

      // Set secure HTTP-only cookie
      res.cookie('super_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/hq'
      });

      return res.status(HttpStatus.OK).json({
        status: result.status,
        admin: result.admin
      });
    } catch (err) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('super_token', { path: '/hq' });
    return res.status(HttpStatus.OK).json({ status: 'SUCCESS' });
  }
}
