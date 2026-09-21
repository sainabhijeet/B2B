/** Local defaults for System Settings forms — replace with GET/PATCH system_settings API. */

export const platformDefaults = {
  platformName: 'Superhit SaaS',
  platformUrl: 'https://app.superhit.example',
  supportEmail: 'support@superhit.example',
  supportPhone: '+91 98765 43210',
  defaultLanguage: 'en',
  defaultCurrency: 'INR',
  timezone: 'Asia/Kolkata',
};

export const notificationDefaults = {
  emailProvider: 'smtp',
  smtpHost: 'smtp.example.com',
  smtpPort: 587,
  smtpUser: '',
  smsProvider: 'msg91',
  pushProvider: 'firebase',
  freePlanNotificationLimit: 100,
  paidPlanNotificationLimit: 1000000000,
};

export const paymentDefaults = {
  paymentGateway: 'razorpay',
  upiId: 'superhit@upi',
  bankDetails: 'Superhit Pvt Ltd · A/C ****4421 · IFSC HDFC0001234',
  invoicePrefix: 'SH-INV',
  gstNumber: '29ABCDE1234F1Z5',
};

export const buildEnvDefaults = {
  maxParallelBuilds: 3,
  buildTimeoutMinutes: 45,
  retryLimit: 2,
  artifactRetentionDays: 30,
};

export const storageDefaults = {
  storageProvider: 's3' as 's3' | 'r2' | 'local',
  bucketName: 'superhit-tenant-assets',
  maxFileUploadMb: 1,
  allowedFileTypes: 'jpg,jpeg,png,webp,pdf,zip',
};

export const apiDefaults = {
  apiBaseUrl: 'https://shopiva.cubatic.co/api/v1',
  apiRateLimitPerMinute: 1000,
  apiKeyExpiryDays: 365,
  corsAllowedDomains: 'https://admin.example.com,https://*.tenantapp.example',
};

export const securityDefaults = {
  enable2FA: false,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireNumber: true,
  ipWhitelist: '',
  tokenExpiryHours: 24,
};

export const maintenanceDefaults = {
  enabled: false,
  message: 'Platform under maintenance. We will be back shortly.',
  allowedIps: '203.0.113.10,203.0.113.11',
};

export const logsDefaults = {
  errorLogRetentionDays: 30,
  apiLogRetentionDays: 14,
  activityLogRetentionDays: 90,
};
