import type { IntegrationStatus } from '@/lib/integrationsDemoData';

export type OtpProviderId = 'firebase' | 'msg91' | 'custom_sms';

export type PlatformAuthSettings = {
  otpProvider: OtpProviderId;
  otpExpiryMinutes: number;
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
  /** From GET /admin/platform-settings/auth — only providers allowed for the current DB SMS rows. */
  availableOtpProviders: OtpProviderId[];
};

export type SmsProviderApiRow = {
  id: string;
  provider: string;
  apiKeyMasked: string;
  senderId: string;
  route: string;
  status: IntegrationStatus;
};

export type SmsProvidersResponse = { providers: SmsProviderApiRow[] };

export type SmsProviderWrite = {
  id: string;
  provider: string;
  senderId: string;
  route: string;
  status: IntegrationStatus;
  apiKey?: string;
};

export type FirebaseAdminMaskedResponse = {
  projectId: string;
  clientEmail: string;
  privateKeyMasked: string;
  status: IntegrationStatus;
};

export type FirebaseAdminPutBody = {
  projectId: string;
  clientEmail: string;
  privateKey?: string;
  status: IntegrationStatus;
};
