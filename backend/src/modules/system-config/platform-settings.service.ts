import { BadRequestException, Injectable } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import {
  PLATFORM_AUTH_SETTINGS_KEY,
  PLATFORM_FIREBASE_ADMIN_KEY,
  PLATFORM_SMS_PROVIDERS_KEY,
} from './platform-settings.keys';
import type { PlatformAuthSettingsDto } from './dto/platform-auth-settings.dto';
import type { PutFirebaseAdminDto } from './dto/put-firebase-admin.dto';
import type { SmsProviderItemDto } from './dto/sms-provider-item.dto';

export type OtpProviderKind = 'firebase' | 'msg91' | 'custom_sms';

/** Stored auth policy (system_config) — no derived UI fields. */
export type PlatformAuthSettingsPayload = {
  otpProvider: OtpProviderKind;
  otpExpiryMinutes: number;
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
};

/** GET auth + which OTP modes are allowed from current DB (SMS rows). */
export type PlatformAuthSettingsResponse = PlatformAuthSettingsPayload & {
  availableOtpProviders: OtpProviderKind[];
};

export type SmsProviderStored = {
  id: string;
  provider: string;
  apiKey: string;
  senderId: string;
  route: string;
  status: 'active' | 'inactive' | 'error';
};

export type SmsProviderMasked = Omit<SmsProviderStored, 'apiKey'> & { apiKeyMasked: string };

export type FirebaseAdminStored = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  status: 'active' | 'inactive';
};

export type FirebaseAdminMasked = {
  projectId: string;
  clientEmail: string;
  privateKeyMasked: string;
  status: 'active' | 'inactive';
};

const EMPTY_FIREBASE_ADMIN: FirebaseAdminStored = {
  projectId: '',
  clientEmail: '',
  privateKey: '',
  status: 'inactive',
};

const DEFAULT_AUTH: PlatformAuthSettingsPayload = {
  otpProvider: 'firebase',
  otpExpiryMinutes: 5,
  maxLoginAttempts: 5,
  sessionTimeoutMinutes: 60,
};

function maskKey(key: string): string {
  const t = key.trim();
  if (!t) return '—';
  if (t.length <= 4) return '••••';
  return `••••••••${t.slice(-4)}`;
}

function parseStoredSms(raw: string | null | undefined): SmsProviderStored[] {
  if (!raw?.trim()) return [];
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    return j
      .filter((x): x is SmsProviderStored => {
        if (!x || typeof x !== 'object') return false;
        const o = x as Record<string, unknown>;
        return (
          typeof o.id === 'string' &&
          typeof o.provider === 'string' &&
          typeof o.apiKey === 'string' &&
          typeof o.senderId === 'string' &&
          typeof o.route === 'string' &&
          typeof o.status === 'string'
        );
      })
      .map((o) => ({
        id: o.id,
        provider: o.provider,
        apiKey: o.apiKey,
        senderId: o.senderId,
        route: o.route,
        status: o.status as SmsProviderStored['status'],
      }));
  } catch {
    return [];
  }
}

function parseStoredFirebaseAdmin(raw: string | null | undefined): FirebaseAdminStored {
  if (!raw?.trim()) return { ...EMPTY_FIREBASE_ADMIN };
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const status = j.status === 'active' ? 'active' : 'inactive';
    return {
      projectId: typeof j.projectId === 'string' ? j.projectId : '',
      clientEmail: typeof j.clientEmail === 'string' ? j.clientEmail : '',
      privateKey: typeof j.privateKey === 'string' ? j.privateKey : '',
      status,
    };
  } catch {
    return { ...EMPTY_FIREBASE_ADMIN };
  }
}

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly systemConfig: SystemConfigService) {}

  /**
   * OTP modes the admin may pick: Firebase always; MSG91 / custom only when an active
   * SMS row exists in `platform_sms_providers` with a non-empty API key (MSG91 vs other provider string).
   */
  async computeAvailableOtpProviders(): Promise<OtpProviderKind[]> {
    const out: OtpProviderKind[] = ['firebase'];
    const rows = await this.getSmsProvidersStored();
    let hasMsg91 = false;
    let hasCustomSms = false;
    for (const r of rows) {
      if (r.status !== 'active' || !r.apiKey.trim()) continue;
      const p = r.provider.toUpperCase();
      if (p.includes('MSG91')) hasMsg91 = true;
      else hasCustomSms = true;
    }
    if (hasMsg91) out.push('msg91');
    if (hasCustomSms) out.push('custom_sms');
    return out;
  }

  private async readAuthSettingsPayload(): Promise<PlatformAuthSettingsPayload> {
    const row = await this.systemConfig.getConfig(PLATFORM_AUTH_SETTINGS_KEY);
    if (!row?.value?.trim()) {
      return { ...DEFAULT_AUTH };
    }
    try {
      const parsed = JSON.parse(row.value) as Partial<PlatformAuthSettingsPayload>;
      return {
        otpProvider: parsed.otpProvider ?? DEFAULT_AUTH.otpProvider,
        otpExpiryMinutes: Number(parsed.otpExpiryMinutes) || DEFAULT_AUTH.otpExpiryMinutes,
        maxLoginAttempts: Number(parsed.maxLoginAttempts) || DEFAULT_AUTH.maxLoginAttempts,
        sessionTimeoutMinutes: Number(parsed.sessionTimeoutMinutes) || DEFAULT_AUTH.sessionTimeoutMinutes,
      };
    } catch {
      return { ...DEFAULT_AUTH };
    }
  }

  private async writeAuthSettingsPayload(payload: PlatformAuthSettingsPayload): Promise<void> {
    await this.systemConfig.setConfig({
      key: PLATFORM_AUTH_SETTINGS_KEY,
      value: JSON.stringify(payload),
    });
  }

  async getAuthSettings(): Promise<PlatformAuthSettingsResponse> {
    const available = await this.computeAvailableOtpProviders();
    const raw = await this.readAuthSettingsPayload();
    const otpProvider = (available.includes(raw.otpProvider) ? raw.otpProvider : available[0]) as OtpProviderKind;
    const normalized: PlatformAuthSettingsPayload = { ...raw, otpProvider };
    if (normalized.otpProvider !== raw.otpProvider) {
      await this.writeAuthSettingsPayload(normalized);
    }
    return { ...normalized, availableOtpProviders: available };
  }

  async setAuthSettings(dto: PlatformAuthSettingsDto): Promise<PlatformAuthSettingsResponse> {
    const available = await this.computeAvailableOtpProviders();
    if (!available.includes(dto.otpProvider)) {
      throw new BadRequestException(
        `OTP provider is not available for the current SMS configuration. Allowed: ${available.join(', ')}.`,
      );
    }
    await this.writeAuthSettingsPayload(dto);
    return { ...dto, availableOtpProviders: available };
  }

  async getSmsProvidersMasked(): Promise<{ providers: SmsProviderMasked[] }> {
    const row = await this.systemConfig.getConfig(PLATFORM_SMS_PROVIDERS_KEY);
    const list = parseStoredSms(row?.value ?? null);
    return {
      providers: list.map((p) => ({
        id: p.id,
        provider: p.provider,
        senderId: p.senderId,
        route: p.route,
        status: p.status,
        apiKeyMasked: maskKey(p.apiKey),
      })),
    };
  }

  /** Full rows for runtime (MSG91 key etc.). */
  async getSmsProvidersStored(): Promise<SmsProviderStored[]> {
    const row = await this.systemConfig.getConfig(PLATFORM_SMS_PROVIDERS_KEY);
    return parseStoredSms(row?.value ?? null);
  }

  async setSmsProviders(dtos: SmsProviderItemDto[]): Promise<{ providers: SmsProviderMasked[] }> {
    const existing = await this.getSmsProvidersStored();
    const byId = new Map(existing.map((e) => [e.id, e]));

    const next: SmsProviderStored[] = dtos.map((d) => {
      const prev = byId.get(d.id);
      const apiKey =
        d.apiKey !== undefined && d.apiKey.trim() !== ''
          ? d.apiKey.trim()
          : (prev?.apiKey ?? '');
      return {
        id: d.id,
        provider: d.provider.trim(),
        apiKey,
        senderId: d.senderId.trim(),
        route: d.route.trim(),
        status: d.status,
      };
    });

    await this.systemConfig.setConfig({
      key: PLATFORM_SMS_PROVIDERS_KEY,
      value: JSON.stringify(next),
    });
    return this.getSmsProvidersMasked();
  }

  async getFirebaseAdminStored(): Promise<FirebaseAdminStored> {
    const row = await this.systemConfig.getConfig(PLATFORM_FIREBASE_ADMIN_KEY);
    return parseStoredFirebaseAdmin(row?.value ?? null);
  }

  async getFirebaseAdminMasked(): Promise<FirebaseAdminMasked> {
    const s = await this.getFirebaseAdminStored();
    return {
      projectId: s.projectId,
      clientEmail: s.clientEmail,
      privateKeyMasked: maskKey(s.privateKey),
      status: s.status,
    };
  }

  async setFirebaseAdmin(dto: PutFirebaseAdminDto): Promise<FirebaseAdminMasked> {
    const prev = await this.getFirebaseAdminStored();
    const privateKey =
      dto.privateKey !== undefined && dto.privateKey.trim() !== ''
        ? dto.privateKey.trim()
        : prev.privateKey;
    const next: FirebaseAdminStored = {
      projectId: dto.projectId.trim(),
      clientEmail: dto.clientEmail.trim(),
      privateKey,
      status: dto.status,
    };
    await this.systemConfig.setConfig({
      key: PLATFORM_FIREBASE_ADMIN_KEY,
      value: JSON.stringify(next),
    });
    return this.getFirebaseAdminMasked();
  }
}
