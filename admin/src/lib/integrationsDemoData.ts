/** Demo — maps to integrations, webhooks-style tables; credentials are session-only. */

export const PLATFORM_FCM_PUSH_ID = 'platform-firebase-fcm';

export type IntegrationStatus = 'active' | 'inactive' | 'error';

export type SmsProviderRow = {
  id: string;
  provider: string;
  apiKeyMasked: string;
  senderId: string;
  route: string;
  status: IntegrationStatus;
};

export type EmailProviderRow = {
  id: string;
  provider: string;
  smtpHost: string;
  port: number;
  username: string;
  passwordMasked: string;
  fromEmail: string;
  fromName: string;
  status: IntegrationStatus;
};

export type PushProviderRow = {
  id: string;
  provider: string;
  projectId: string;
  serverKeyMasked: string;
  appId: string;
  status: IntegrationStatus;
  /** Firebase service account email (FCM row from API). */
  clientEmail?: string;
  /** Row backed by GET /admin/platform-settings/firebase-admin */
  firebaseFromApi?: boolean;
};

export type PaymentGatewayRow = {
  id: string;
  gateway: string;
  apiKeyMasked: string;
  secretMasked: string;
  webhookUrl: string;
  status: IntegrationStatus;
};

export type StorageProviderRow = {
  id: string;
  provider: string;
  bucket: string;
  accessKeyMasked: string;
  secretMasked: string;
  region: string;
  maxUploadMb: number;
  status: IntegrationStatus;
};

export type WebhookRow = {
  webhookId: string;
  eventType: string;
  url: string;
  secretMasked: string;
  status: IntegrationStatus;
  updatedAt: string;
};

export type ApiKeyRow = {
  id: string;
  name: string;
  keyMasked: string;
  permissions: string;
  status: IntegrationStatus;
  createdAt: string;
};

export const INITIAL_SMS: SmsProviderRow[] = [
  {
    id: 'sms-1',
    provider: 'MSG91',
    apiKeyMasked: '••••••••6d2f',
    senderId: 'SUPERH',
    route: 'Transactional',
    status: 'active',
  },
  {
    id: 'sms-2',
    provider: 'Twilio',
    apiKeyMasked: '••••••••9ab1',
    senderId: 'TWILIO',
    route: 'Primary',
    status: 'inactive',
  },
];

export const INITIAL_EMAIL: EmailProviderRow[] = [
  {
    id: 'em-1',
    provider: 'SMTP',
    smtpHost: 'smtp.gmail.com',
    port: 587,
    username: 'notify@platform.com',
    passwordMasked: '••••••••',
    fromEmail: 'notify@platform.com',
    fromName: 'Shopiva Platform',
    status: 'active',
  },
];

export const INITIAL_PUSH: PushProviderRow[] = [
  {
    id: 'push-2',
    provider: 'OneSignal',
    projectId: '—',
    serverKeyMasked: '••••••••••••91c0',
    appId: 'onesignal-app-id-demo',
    status: 'inactive',
  },
];

export const INITIAL_PAYMENTS: PaymentGatewayRow[] = [
  {
    id: 'pay-1',
    gateway: 'Razorpay',
    apiKeyMasked: 'rzp_live_••••••••',
    secretMasked: '••••••••',
    webhookUrl: 'https://api.platform.com/webhooks/razorpay',
    status: 'active',
  },
  {
    id: 'pay-2',
    gateway: 'Stripe',
    apiKeyMasked: 'sk_live_••••••••',
    secretMasked: '••••••••',
    webhookUrl: 'https://api.platform.com/webhooks/stripe',
    status: 'error',
  },
];

export const INITIAL_STORAGE: StorageProviderRow[] = [
  {
    id: 'st-1',
    provider: 'Cloudflare R2',
    bucket: 'superhit-storage',
    accessKeyMasked: '••••••••3e1a',
    secretMasked: '••••••••',
    region: 'auto',
    maxUploadMb: 25,
    status: 'active',
  },
  {
    id: 'st-2',
    provider: 'AWS S3',
    bucket: 'legacy-assets',
    accessKeyMasked: '••••••••',
    secretMasked: '••••••••',
    region: 'ap-south-1',
    maxUploadMb: 50,
    status: 'inactive',
  },
];

export const INITIAL_WEBHOOKS: WebhookRow[] = [
  {
    webhookId: 'wh-1',
    eventType: 'order_created',
    url: 'https://client.example.com/webhook/orders',
    secretMasked: 'whsec_••••••••',
    status: 'active',
    updatedAt: '2026-04-10T08:00:00+05:30',
  },
  {
    webhookId: 'wh-2',
    eventType: 'tenant_registered',
    url: 'https://partner.example/hooks/onboard',
    secretMasked: '••••••••',
    status: 'active',
    updatedAt: '2026-04-09T14:30:00+05:30',
  },
  {
    webhookId: 'wh-3',
    eventType: 'build_completed',
    url: 'https://automation.internal/build',
    secretMasked: '••••••••',
    status: 'inactive',
    updatedAt: '2026-04-01T12:00:00+05:30',
  },
];

export const INITIAL_API_KEYS: ApiKeyRow[] = [
  {
    id: 'apk-1',
    name: 'Mobile App API',
    keyMasked: 'sk_live_••••••••7f3c',
    permissions: 'Read / Write',
    status: 'active',
    createdAt: '2026-01-12',
  },
  {
    id: 'apk-2',
    name: 'Partner reporting',
    keyMasked: 'sk_live_••••••••2aa1',
    permissions: 'Read only',
    status: 'active',
    createdAt: '2026-03-01',
  },
];
