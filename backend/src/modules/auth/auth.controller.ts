import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CustomerFirebaseLoginDto } from './dto/customer-firebase-login.dto';
import { CustomerOtpLoginDto } from './dto/customer-otp-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { TenantSimpleRegisterDto } from './dto/tenant-simple-register.dto';
import { TenantStaffLoginDto } from './dto/tenant-staff-login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpSessionDto } from './dto/verify-otp-session.dto';
import { AdminTenantHandoffDto } from './dto/admin-tenant-handoff.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/types/authenticated-request.type';
import {
  clearAuthCookies,
  refreshTokenFromCookie,
  setAuthCookies,
} from '../../common/security/auth-cookies';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBody({
    type: AdminLoginDto,
    examples: {
      superAdmin: {
        summary: 'Platform super admin',
        value: {
          email: 'admin@example.com',
          password: '<strong-admin-password>',
          deviceId: 'web-admin-session-1',
        },
      },
    },
  })
  async adminLogin(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.adminLogin(dto);
    setAuthCookies(res, tokens);
    return tokens;
  }

  @Post('admin/tenant-handoff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth('bearer')
  adminTenantHandoff(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: AdminTenantHandoffDto,
  ) {
    // Intentionally do not set auth cookies here: that would replace the admin
    // session because both panels share the API origin.
    return this.authService.adminTenantHandoff(user, dto.tenantId, dto.deviceId);
  }

  @Post('tenant/login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async tenantStaffLogin(@Body() dto: TenantStaffLoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.tenantStaffLogin(dto);
    setAuthCookies(res, tokens);
    return tokens;
  }

  @Post('tenant/register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiBody({
    type: TenantSimpleRegisterDto,
    examples: {
      newTenant: {
        summary: 'Create tenant + owner (self-service)',
        value: {
          ownerEmail: 'owner@acme.example.com',
          ownerPassword: '<strong-owner-password>',
          countryId: '00000000-0000-4000-8000-000000000001',
          phone: '9876543210',
          referralCode: 'A1B2C3D4123',
          deviceId: 'web-distributor-session-1',
        },
      },
    },
  })
  async tenantRegister(
    @Body() dto: TenantSimpleRegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim() || null
        : Array.isArray(forwarded)
          ? forwarded[0]?.trim() || null
          : req.ip || null;
    const tokens = await this.authService.registerTenant(dto, clientIp);
    setAuthCookies(res, tokens);
    return tokens;
  }

  @Post('send-otp')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async verifyOtpSession(
    @Body() dto: VerifyOtpSessionDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim() || null
        : Array.isArray(forwarded)
          ? forwarded[0]?.trim() || null
          : req.ip || null;
    const tokens = await this.authService.verifyOtpSession(dto, clientIp);
    setAuthCookies(res, tokens);
    return tokens;
  }

  @Post('customer/login-otp')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async customerOtpLogin(@Body() dto: CustomerOtpLoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.customerOtpLogin(dto);
    setAuthCookies(res, tokens);
    return tokens;
  }

  @Post('customer/firebase-login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async customerFirebaseLogin(
    @Body() dto: CustomerFirebaseLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.customerFirebaseLogin(dto);
    setAuthCookies(res, tokens);
    return tokens;
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiBody({
    type: RefreshTokenDto,
    examples: {
      default: {
        summary: 'Rotate access token',
        value: {
          refreshToken: '<paste_refresh_token_from_login>',
          deviceId: 'web-admin-session-1',
        },
      },
    },
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = dto.refreshToken || refreshTokenFromCookie(req);
    if (!refreshToken) return this.authService.rejectMissingRefreshToken();
    const tokens = await this.authService.refreshTokens(refreshToken, dto.deviceId);
    setAuthCookies(res, tokens);
    return tokens;
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  session(@CurrentUser() user: JwtUserPayload) {
    return { success: true, data: user };
  }

  @Post('password-reset/request')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = dto.refreshToken || refreshTokenFromCookie(req);
    if (refreshToken) await this.authService.logout(refreshToken, dto.deviceId);
    clearAuthCookies(res);
    return { success: true };
  }
}
