import type { OtpProviderId } from '@/lib/platformSettingsApi';

export const OTP_PROVIDER_LABELS: Record<OtpProviderId, string> = {
  firebase: 'Firebase',
  msg91: 'MSG91',
  custom_sms: 'Custom SMS API',
};
