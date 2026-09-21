import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformSettingsService } from '../../modules/system-config/platform-settings.service';

/** Platform SMS / OTP — credentials only from DB (`platform_sms_providers` active row). */
@Injectable()
export class SmsService {
  private readonly log = new Logger(SmsService.name);

  constructor(
    private readonly platformSettings: PlatformSettingsService,
    private readonly configService: ConfigService,
  ) {}

  async sendOtpSms(
    toPhoneDigits: string,
    code: string,
  ): Promise<{ channel: 'sms' | 'development' }> {
    if (this.configService.get<boolean>('otp.developmentEchoEnabled', false)) {
      return { channel: 'development' };
    }

    const stored = await this.platformSettings.getSmsProvidersStored();
    const active = stored.find(
      (row) =>
        row.status === 'active' &&
        row.provider.toUpperCase().includes('MSG91'),
    );
    const authKey = active?.apiKey.trim() ?? '';
    const templateId = active?.route.trim() ?? '';

    if (!authKey || !templateId || /^(transactional|primary)$/i.test(templateId)) {
      throw new ServiceUnavailableException(
        'OTP delivery is not configured. Add an active MSG91 provider with its API key and OTP template ID.',
      );
    }

    const query = new URLSearchParams({
      template_id: templateId,
      mobile: toPhoneDigits,
      authkey: authKey,
      otp: code,
      otp_expiry: '5',
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let response: Response;
    try {
      response = await fetch(`https://control.msg91.com/api/v5/otp?${query.toString()}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: '{}',
        signal: controller.signal,
      });
    } catch {
      throw new ServiceUnavailableException('OTP provider is temporarily unavailable.');
    } finally {
      clearTimeout(timeout);
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // A non-JSON provider response is treated as a failed delivery.
    }
    const result = payload as { type?: unknown; message?: unknown } | null;
    if (!response.ok || result?.type !== 'success') {
      this.log.warn(
        `MSG91 rejected OTP delivery. status=${response.status} type=${String(result?.type ?? 'unknown')}`,
      );
      throw new ServiceUnavailableException('OTP provider rejected the delivery request.');
    }

    this.log.log(`OTP delivered through MSG91. to=${toPhoneDigits.slice(0, 4)}…`);
    return { channel: 'sms' };
  }
}
