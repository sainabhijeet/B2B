import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { PasswordResetToken } from '../../common/entities/password-reset-token.entity';
import { RefreshToken } from '../../common/entities/refresh-token.entity';
import { User } from '../../common/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { EmailService } from '../../common/services/email.service';
import { FirebaseAuthService } from '../../common/services/firebase-auth.service';
import type { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { randomToken, sha256 } from '../../common/utils/hash.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { OtpPurpose } from '../otp/otp-purpose';
import { OtpService } from '../otp/otp.service';
import { UsersService } from '../users/users.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CustomerFirebaseLoginDto } from './dto/customer-firebase-login.dto';
import { CustomerOtpLoginDto } from './dto/customer-otp-login.dto';
import { DeleteStorefrontCustomerAccountDto } from './dto/delete-storefront-customer-account.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { TenantSimpleRegisterDto } from './dto/tenant-simple-register.dto';
import { TenantStaffLoginDto } from './dto/tenant-staff-login.dto';
import { VerifyOtpSessionDto } from './dto/verify-otp-session.dto';
import { normalizeCustomerMobile } from '../../common/utils/phone-normalize.util';
import { CustomersService } from '../customers/customers.service';
import { CountriesService } from '../countries/countries.service';
import { CreateTenantDto } from '../tenants/dto/create-tenant.dto';
import { TenantsService } from '../tenants/tenants.service';
import { PlatformSettingsService } from '../system-config/platform-settings.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly countriesService: CountriesService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly auditLogsService: AuditLogsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly customersService: CustomersService,
  ) {}

  async adminLogin(dto: AdminLoginDto) {
    const user = await this.usersService.findAdminByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!this.usersService.isAdminRole(user.role)) {
      throw new UnauthorizedException('Not an admin account.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials.');

    const tokens = await this.issueTokens(user, dto.deviceId);
    await this.auditLogsService.log({
      action: 'AUTH_ADMIN_LOGIN',
      actorUserId: user.id,
      metadata: { deviceId: dto.deviceId },
    });
    return tokens;
  }

  async adminTenantHandoff(actor: JwtUserPayload, tenantId: string, deviceId: string) {
    if (actor.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException('Only a super admin can start a tenant handoff.');
    }
    const tenant = await this.tenantsService.getById(tenantId);
    if (tenant.status !== 'active') {
      throw new BadRequestException('Only active tenants can be opened in the distributor panel.');
    }
    const owner = await this.usersService.findTenantOwner(tenantId);
    if (!owner) throw new NotFoundException('Tenant owner account not found.');
    const tokens = await this.issueTokens(owner, deviceId);
    await this.auditLogsService.log({
      action: 'AUTH_ADMIN_TENANT_HANDOFF',
      actorUserId: actor.sub,
      tenantId,
      metadata: { deviceId, ownerUserId: owner.id },
    });
    return tokens;
  }

  /** Tenant distributor panel — not for CUSTOMER or platform admins. */
  async tenantStaffLogin(dto: TenantStaffLoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash || !user.tenantId) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    if (this.usersService.isAdminRole(user.role)) {
      throw new UnauthorizedException('Use admin login for this account.');
    }
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.MANAGER &&
      user.role !== UserRole.STAFF
    ) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials.');

    const tokens = await this.issueTokens(user, dto.deviceId);
    await this.auditLogsService.log({
      action: 'AUTH_TENANT_STAFF_LOGIN',
      actorUserId: user.id,
      tenantId: user.tenantId,
      metadata: { deviceId: dto.deviceId },
    });
    return tokens;
  }

  /** Public signup: creates tenant + owner (FREE plan), returns JWTs like tenant login. */
  async registerTenant(dto: TenantSimpleRegisterDto, clientIp?: string | null) {
    const email = dto.ownerEmail.trim().toLowerCase();
    const country = await this.countriesService.requireActiveCountry(dto.countryId);
    const codeDigits = country.phoneCode.replace(/\D/g, '');
    const national = dto.phone.replace(/\D/g, '');
    const ownerPhone = `${codeDigits}${national}`;
    if (!/^\d{10,15}$/.test(ownerPhone)) {
      throw new BadRequestException('Phone with country code must be 10–15 digits.');
    }
    const { slug, name } = await this.tenantsService.allocateSlugAndNameForNewTenant(email);
    const createPayload: CreateTenantDto = {
      slug,
      name,
      ownerEmail: email,
      ownerPassword: dto.ownerPassword,
      ownerPhone,
      countryId: dto.countryId,
      referralCode: dto.referralCode,
    };
    await this.tenantsService.create(createPayload, { clientIp });
    const user = await this.usersService.findByEmail(email);
    if (!user?.tenantId) {
      throw new NotFoundException('Could not load new account.');
    }
    const tokens = await this.issueTokens(user, dto.deviceId);
    await this.auditLogsService.log({
      action: 'AUTH_TENANT_SELF_REGISTER',
      actorUserId: user.id,
      tenantId: user.tenantId,
      metadata: { deviceId: dto.deviceId },
    });
    return tokens;
  }

  /** Platform OTP — reusable for distributor panel, storefront customer, etc. */
  async sendOtp(dto: SendOtpDto) {
    if (dto.purpose === OtpPurpose.DISTRIBUTOR_PANEL) {
      if (!dto.countryId || dto.nationalPhone == null) {
        throw new BadRequestException('countryId and nationalPhone are required.');
      }
      const full = await this.buildDistributorE164(dto.countryId, dto.nationalPhone);
      return this.otpService.requestOtpForRecipient({
        purpose: OtpPurpose.DISTRIBUTOR_PANEL,
        tenantId: null,
        phone: full,
      });
    }
    if (dto.purpose === OtpPurpose.CUSTOMER_TENANT) {
      if (!dto.tenantId || !dto.phone) {
        throw new BadRequestException('tenantId and phone are required.');
      }
      const phone = normalizeCustomerMobile(dto.phone);
      await this.customersService.requireActiveByTenantAndMobile(dto.tenantId, phone);
      return this.otpService.requestOtpForRecipient({
        purpose: OtpPurpose.CUSTOMER_TENANT,
        tenantId: dto.tenantId,
        phone,
      });
    }
    throw new BadRequestException('Unsupported OTP purpose.');
  }

  /**
   * Storefront-only: `tenantId` comes from `TenantMiddleware` (subdomain / headers).
   * Same OTP channel as `purpose: customer_tenant`.
   */
  async storefrontCustomerRequestLoginOtp(tenantId: string, mobileRaw: string) {
    const phone = normalizeCustomerMobile(mobileRaw);
    if (this.isStorefrontFixedTestMobile(phone)) {
      await this.customersService.ensureDevTestCustomer(tenantId, phone);
    } else {
      await this.customersService.requireActiveByTenantAndMobile(tenantId, phone);
    }
    return this.otpService.requestOtpForRecipient({
      purpose: OtpPurpose.CUSTOMER_TENANT,
      tenantId,
      phone,
    });
  }

  async storefrontCustomerVerifyOtpAndLogin(
    tenantId: string,
    mobileRaw: string,
    code: string,
    deviceId: string,
  ) {
    const phone = normalizeCustomerMobile(mobileRaw);
    await this.otpService.verifyOtpForRecipient(
      { purpose: OtpPurpose.CUSTOMER_TENANT, tenantId, phone },
      code,
    );
    return this.finishCustomerOtpLogin({ tenantId, phone, deviceId });
  }

  async storefrontCustomerRequestAccountDeletionOtp(actor: JwtUserPayload) {
    const customer = await this.customersService.requireStorefrontCustomer(actor);
    return this.otpService.requestOtpForRecipient({
      purpose: OtpPurpose.ACCOUNT_DELETION,
      tenantId: customer.tenantId,
      phone: customer.mobile,
    });
  }

  async storefrontCustomerDeleteAccount(
    actor: JwtUserPayload,
    dto: DeleteStorefrontCustomerAccountDto,
  ) {
    const customer = await this.customersService.requireStorefrontCustomer(actor);
    await this.otpService.verifyOtpForRecipient(
      {
        purpose: OtpPurpose.ACCOUNT_DELETION,
        tenantId: customer.tenantId,
        phone: customer.mobile,
      },
      dto.code,
    );

    await this.auditLogsService.log({
      action: 'CUSTOMER_ACCOUNT_DELETION_CONFIRMED',
      actorUserId: actor.sub,
      tenantId: customer.tenantId,
      metadata: { customerId: customer.id },
    });

    return this.customersService.deleteStorefrontCustomerAccount(actor);
  }

  async verifyOtpSession(dto: VerifyOtpSessionDto, clientIp?: string | null) {
    if (dto.purpose === OtpPurpose.DISTRIBUTOR_PANEL) {
      if (!dto.countryId || dto.nationalPhone == null) {
        throw new BadRequestException('countryId and nationalPhone are required.');
      }
      const full = await this.buildDistributorE164(dto.countryId, dto.nationalPhone);
      await this.otpService.verifyOtpForRecipient(
        { purpose: OtpPurpose.DISTRIBUTOR_PANEL, tenantId: null, phone: full },
        dto.code,
      );
      let user = await this.usersService.findDistributorOwnerByPhone(full);
      if (!user) {
        await this.tenantsService.createTenantForMobileOwner(full, {
          clientIp,
          countryId: dto.countryId,
        });
        user = await this.usersService.findDistributorOwnerByPhone(full);
      }
      if (!user?.tenantId) {
        throw new NotFoundException('Could not load account.');
      }
      await this.usersService.markPhoneVerified(user.id);
      const tokens = await this.issueTokens(user, dto.deviceId);
      await this.auditLogsService.log({
        action: 'AUTH_DISTRIBUTOR_OTP_LOGIN',
        actorUserId: user.id,
        tenantId: user.tenantId,
        metadata: { deviceId: dto.deviceId },
      });
      return tokens;
    }

    if (dto.purpose === OtpPurpose.CUSTOMER_TENANT) {
      if (!dto.tenantId || !dto.phone) {
        throw new BadRequestException('tenantId and phone are required.');
      }
      const phone = normalizeCustomerMobile(dto.phone);
      await this.otpService.verifyOtpForRecipient(
        { purpose: OtpPurpose.CUSTOMER_TENANT, tenantId: dto.tenantId, phone },
        dto.code,
      );
      return this.finishCustomerOtpLogin({
        tenantId: dto.tenantId,
        phone,
        deviceId: dto.deviceId,
      });
    }

    throw new BadRequestException('Unsupported OTP purpose.');
  }

  async customerOtpLogin(dto: CustomerOtpLoginDto) {
    const phone = normalizeCustomerMobile(dto.phone);
    await this.otpService.verifyOtp(dto.tenantId, phone, dto.code);
    return this.finishCustomerOtpLogin({
      tenantId: dto.tenantId,
      phone,
      deviceId: dto.deviceId,
    });
  }

  private async finishCustomerOtpLogin(dto: {
    tenantId: string;
    phone: string;
    deviceId: string;
  }) {
    const customer = this.isStorefrontFixedTestMobile(dto.phone)
      ? await this.customersService.ensureDevTestCustomer(dto.tenantId, dto.phone)
      : await this.customersService.requireActiveByTenantAndMobile(dto.tenantId, dto.phone);

    let user = await this.usersService.findTenantCustomerUserByPhone(dto.tenantId, dto.phone);
    if (!user) {
      user = await this.usersService.create({
        tenantId: dto.tenantId,
        phone: dto.phone,
        role: UserRole.CUSTOMER,
        email: customer.email ?? undefined,
        customerId: customer.id,
      });
    } else if (user.customerId !== customer.id) {
      await this.usersService.setCustomerId(user.id, customer.id);
      user.customerId = customer.id;
    }

    await this.usersService.markPhoneVerified(user.id);
    const tokens = await this.issueTokens(user, dto.deviceId);
    await this.auditLogsService.log({
      action: 'AUTH_CUSTOMER_LOGIN_OTP',
      actorUserId: user.id,
      tenantId: user.tenantId,
      metadata: { deviceId: dto.deviceId, customerId: customer.id },
    });
    return tokens;
  }

  private isStorefrontFixedTestMobile(phone: string): boolean {
    const configured = (
      this.configService.get<string>('storefront.testCustomerMobile') ??
      process.env.STOREFRONT_TEST_CUSTOMER_MOBILE ??
      '9999999999'
    ).replace(/\D/g, '');
    return this.configService.get<boolean>('otp.fixedCodeEnabled', false) && phone === configured;
  }

  async customerFirebaseLogin(dto: CustomerFirebaseLoginDto) {
    const auth = await this.platformSettings.getAuthSettings();
    if (auth.otpProvider === 'msg91' || auth.otpProvider === 'custom_sms') {
      throw new BadRequestException(
        'Firebase login is disabled when platform OTP provider is MSG91 / Custom SMS.',
      );
    }

    const tokenData = await this.firebaseAuthService.verifyIdToken(dto.idToken);
    const rawPhone = tokenData.phone;
    if (!rawPhone) {
      throw new UnauthorizedException('Firebase token has no phone number.');
    }
    const phone = normalizeCustomerMobile(rawPhone);

    const customer = await this.customersService.requireActiveByTenantAndMobile(dto.tenantId, phone);

    let user = await this.usersService.findTenantCustomerUserByPhone(dto.tenantId, phone);
    if (!user) {
      user = await this.usersService.create({
        tenantId: dto.tenantId,
        phone,
        role: UserRole.CUSTOMER,
        email: customer.email ?? undefined,
        customerId: customer.id,
      });
    } else if (user.customerId !== customer.id) {
      await this.usersService.setCustomerId(user.id, customer.id);
      user.customerId = customer.id;
    }

    const tokens = await this.issueTokens(user, dto.deviceId);
    await this.auditLogsService.log({
      action: 'AUTH_CUSTOMER_LOGIN_FIREBASE',
      actorUserId: user.id,
      tenantId: user.tenantId,
      metadata: { deviceId: dto.deviceId, firebaseUid: tokenData.uid, customerId: customer.id },
    });
    return tokens;
  }

  async refreshTokens(refreshToken: string, deviceId: string) {
    const tokenHash = sha256(refreshToken);
    const stored = await this.refreshTokenRepository.findOne({
      where: { tokenHash, deviceId },
      relations: ['user'],
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    await this.refreshTokenRepository.delete({ id: stored.id });
    return this.issueTokens(stored.user, deviceId);
  }

  rejectMissingRefreshToken(): never {
    throw new UnauthorizedException('Refresh token is required.');
  }

  async logout(refreshToken: string, deviceId: string): Promise<void> {
    const tokenHash = sha256(refreshToken);
    await this.refreshTokenRepository.delete({ tokenHash, deviceId });
  }

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<{ success: boolean }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) return { success: true };

    const token = randomToken(32);
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 30 * 60_000);

    await this.passwordResetTokenRepository.save(
      this.passwordResetTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      }),
    );

    const baseUrl = this.configService.getOrThrow<string>(
      'app.passwordResetLinkBaseUrl',
    );
    const resetLink = `${baseUrl}?token=${encodeURIComponent(token)}`;
    await this.emailService.sendPasswordResetEmail(dto.email.toLowerCase(), resetLink);

    await this.auditLogsService.log({
      action: 'AUTH_PASSWORD_RESET_REQUESTED',
      actorUserId: user.id,
      tenantId: user.tenantId,
      metadata: { email: dto.email.toLowerCase() },
    });

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean }> {
    const tokenHash = sha256(dto.token);
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { tokenHash },
    });
    if (!resetToken || resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token.');
    }

    await this.usersService.updatePassword(resetToken.userId, dto.newPassword);
    await this.passwordResetTokenRepository.delete({ id: resetToken.id });
    await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId', { userId: resetToken.userId })
      .execute();

    await this.auditLogsService.log({
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      actorUserId: resetToken.userId,
    });
    return { success: true };
  }

  private async buildDistributorE164(countryId: string, nationalPhone: string): Promise<string> {
    const country = await this.countriesService.requireActiveCountry(countryId);
    const codeDigits = country.phoneCode.replace(/\D/g, '');
    const national = nationalPhone.replace(/\D/g, '');
    const ownerPhone = `${codeDigits}${national}`;
    if (!/^\d{10,15}$/.test(ownerPhone)) {
      throw new BadRequestException('Phone with country code must be 10–15 digits.');
    }
    return ownerPhone;
  }

  private async issueTokens(user: User, deviceId: string) {
    if (!deviceId) throw new BadRequestException('deviceId is required.');

    const accessClaims = {
      sub: user.id,
      role: user.role,
      tenant_id: user.tenantId,
      customer_id: user.customerId ?? null,
    };

    const accessToken = await this.jwtService.signAsync(accessClaims, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.configService.getOrThrow<string>('jwt.accessExpires') as any,
    });

    const refreshToken = randomToken(48);
    const refreshExpiresInMs = this.parseDurationToMs(
      this.configService.getOrThrow<string>('jwt.refreshExpires'),
    );
    const expiresAt = new Date(Date.now() + refreshExpiresInMs);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId: user.id,
        tokenHash: sha256(refreshToken),
        deviceId,
        expiresAt,
      }),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.getOrThrow<string>('jwt.accessExpires'),
      user: {
        id: user.id,
        role: user.role,
        tenantId: user.tenantId,
        customerId: user.customerId ?? null,
      },
    };
  }

  private parseDurationToMs(duration: string): number {
    if (duration.endsWith('d')) return Number(duration.slice(0, -1)) * 86_400_000;
    if (duration.endsWith('h')) return Number(duration.slice(0, -1)) * 3_600_000;
    if (duration.endsWith('m')) return Number(duration.slice(0, -1)) * 60_000;
    return Number(duration) * 1000;
  }
}
