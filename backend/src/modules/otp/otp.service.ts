import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomInt } from 'node:crypto';
import { OtpChallenge } from '../../common/entities/otp-challenge.entity';
import { SmsService } from '../../common/services/sms.service';
import { sha256 } from '../../common/utils/hash.util';
import { PlatformSettingsService } from '../system-config/platform-settings.service';
import { OtpPurpose, type OtpPurposeValue } from './otp-purpose';

export type OtpRecipient = {
  purpose: OtpPurposeValue;
  /** Full phone digits (10–15), no + prefix. */
  phone: string;
  tenantId: string | null;
};

@Injectable()
export class OtpService {
  private readonly resendDelaySeconds: number;
  private readonly dailySendLimit: number;

  constructor(
    @InjectRepository(OtpChallenge)
    private readonly otpRepository: Repository<OtpChallenge>,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
    private readonly platformSettings: PlatformSettingsService,
  ) {
    this.resendDelaySeconds = this.configService.get<number>(
      'otp.resendDelaySeconds',
      30,
    );
    this.dailySendLimit = this.configService.get<number>(
      'otp.dailySendLimitPerRecipient',
      20,
    );
  }

  async requestOtpForRecipient(
    recipient: OtpRecipient,
  ): Promise<{ expiresInMinutes: number; developmentCode?: string }> {
    await this.ensureOtpProviderAllowsServerOtp();
    const phone = recipient.phone.replace(/\D/g, '');
    if (!/^\d{8,20}$/.test(phone)) {
      throw new BadRequestException('Invalid phone number.');
    }

    await this.enforceSendRateLimits(recipient, phone);

    const auth = await this.platformSettings.getAuthSettings();
    const expiresInMinutes = auth.otpExpiryMinutes;

    const code = this.generateCode(phone);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60_000);

    const challenge = this.otpRepository.create({
      purpose: recipient.purpose,
      tenantId: recipient.tenantId,
      phone,
      codeHash: sha256(code),
      expiresAt,
      attempts: 0,
    });
    await this.otpRepository.save(challenge);

    try {
      const delivery = await this.smsService.sendOtpSms(phone, code);
      return {
        expiresInMinutes,
        ...(delivery.channel === 'development'
          ? { developmentCode: code }
          : {}),
      };
    } catch (error) {
      await this.otpRepository.delete({ id: challenge.id });
      throw error;
    }
  }

  async verifyOtpForRecipient(
    recipient: OtpRecipient,
    code: string,
  ): Promise<{ ok: true }> {
    await this.ensureOtpProviderAllowsServerOtp();
    const phone = recipient.phone.replace(/\D/g, '');
    if (!/^\d{8,20}$/.test(phone)) {
      throw new BadRequestException('Invalid phone number.');
    }

    const maxVerifyAttempts = (await this.platformSettings.getAuthSettings())
      .maxLoginAttempts;

    const challenge = await this.findLatestChallenge(recipient, phone);
    if (!challenge || challenge.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'OTP expired. Please request a new code.',
      );
    }

    if (challenge.attempts >= maxVerifyAttempts) {
      throw new UnauthorizedException(
        'OTP attempts exceeded. Request a new code.',
      );
    }

    const isValid = challenge.codeHash === sha256(code.trim());

    if (!isValid) {
      challenge.attempts += 1;
      await this.otpRepository.save(challenge);
      throw new UnauthorizedException('Invalid OTP.');
    }
    const consumed = await this.otpRepository.delete({ id: challenge.id });
    if (consumed.affected !== 1) {
      throw new UnauthorizedException('OTP has already been used.');
    }
    return { ok: true };
  }

  /** @deprecated Prefer `requestOtpForRecipient` — kept for internal callers using legacy shape. */
  async requestOtp(
    tenantId: string,
    phone: string,
  ): Promise<{ expiresInMinutes: number }> {
    return this.requestOtpForRecipient({
      purpose: OtpPurpose.CUSTOMER_TENANT,
      tenantId,
      phone,
    });
  }

  /** @deprecated Prefer `verifyOtpForRecipient`. */
  async verifyOtp(
    tenantId: string,
    phone: string,
    code: string,
  ): Promise<void> {
    await this.verifyOtpForRecipient(
      { purpose: OtpPurpose.CUSTOMER_TENANT, tenantId, phone },
      code,
    );
  }

  private async findLatestChallenge(
    recipient: OtpRecipient,
    phone: string,
  ): Promise<OtpChallenge | null> {
    const qb = this.otpRepository
      .createQueryBuilder('c')
      .where('c.purpose = :purpose', { purpose: recipient.purpose })
      .andWhere('c.phone = :phone', { phone })
      .orderBy('c.created_at', 'DESC')
      .take(1);

    if (recipient.tenantId) {
      qb.andWhere('c.tenant_id = :tid', { tid: recipient.tenantId });
    } else {
      qb.andWhere('c.tenant_id IS NULL');
    }

    return qb.getOne();
  }

  private async enforceSendRateLimits(
    recipient: OtpRecipient,
    phone: string,
  ): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60_000);
    const dayCount = await this.otpRepository
      .createQueryBuilder('c')
      .where('c.purpose = :purpose', { purpose: recipient.purpose })
      .andWhere('c.phone = :phone', { phone })
      .andWhere('c.created_at > :since', { since })
      .getCount();

    if (dayCount >= this.dailySendLimit) {
      throw new HttpException(
        'Too many OTP requests for this number. Try again tomorrow.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const last = await this.otpRepository.findOne({
      where: {
        purpose: recipient.purpose,
        phone,
        tenantId: recipient.tenantId === null ? IsNull() : recipient.tenantId,
      },
      order: { createdAt: 'DESC' },
    });

    if (last) {
      const elapsedSec = (Date.now() - last.createdAt.getTime()) / 1000;
      if (elapsedSec < this.resendDelaySeconds) {
        const wait = Math.ceil(this.resendDelaySeconds - elapsedSec);
        throw new HttpException(
          `Please wait ${wait}s before requesting another code.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  private generateCode(phone: string): string {
    const fixedLoginEnabled = this.configService.get<boolean>(
      'otp.developmentFixedLoginEnabled',
      false,
    );
    const fixedPhone = this.configService.get<string>(
      'otp.developmentFixedPhone',
      '',
    );
    const fixedCode = this.configService.get<string>(
      'otp.developmentFixedCode',
      '',
    );
    if (
      fixedLoginEnabled &&
      phone === fixedPhone &&
      /^\d{6}$/.test(fixedCode)
    ) {
      return fixedCode;
    }
    return randomInt(100000, 1000000).toString();
  }

  private async ensureOtpProviderAllowsServerOtp(): Promise<void> {
    if (this.configService.get<boolean>('otp.developmentEchoEnabled', false)) {
      return;
    }
    const auth = await this.platformSettings.getAuthSettings();
    const provider = auth.otpProvider;
    if (provider === 'firebase') {
      throw new BadRequestException(
        'Server OTP is disabled (authentication → OTP provider = firebase). Set provider to MSG91 / Custom SMS in System settings, or enable OTP_FIXED_CODE_ENABLED for development.',
      );
    }
  }
}
