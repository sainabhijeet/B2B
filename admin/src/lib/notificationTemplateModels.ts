export type NotificationChannel = 'sms' | 'email' | 'push' | 'whatsapp';
export type TemplateStatus = 'active' | 'inactive' | 'draft';

export type NotificationTemplateRow = {
  templateId: string;
  name: string;
  eventKey: string;
  eventLabel: string;
  channel: NotificationChannel;
  language: string;
  subject: string | null;
  body: string;
  status: TemplateStatus;
  updatedAt: string;
};

export type NotificationEventDef = {
  key: string;
  label: string;
  description: string;
  typicalChannel: NotificationChannel;
};

export const NOTIFICATION_EVENTS: NotificationEventDef[] = [
  { key: 'user_login_otp', label: 'User login OTP', description: 'Sent when a user requests an OTP to sign in.', typicalChannel: 'sms' },
  { key: 'order_confirmed', label: 'Order confirmation', description: 'Customer placed an order successfully.', typicalChannel: 'email' },
  { key: 'order_status_update', label: 'Order status update', description: 'Shipment or fulfillment stage changed.', typicalChannel: 'push' },
  { key: 'subscription_expiring', label: 'Subscription expiry', description: 'Plan renewal reminder before end date.', typicalChannel: 'email' },
  { key: 'build_completed', label: 'Build completed', description: 'Tenant app build finished in the pipeline.', typicalChannel: 'push' },
  { key: 'password_reset', label: 'Password reset', description: 'Reset link or code after forgot-password flow.', typicalChannel: 'sms' },
];

export type TemplateVariableDef = { token: string; description: string; example: string };

export const TEMPLATE_VARIABLES: TemplateVariableDef[] = [
  { token: '{{otp}}', description: 'One-time passcode for login or verification.', example: '482193' },
  { token: '{{expiry}}', description: 'Minutes until OTP or link expires.', example: '10' },
  { token: '{{customer_name}}', description: 'End customer display name.', example: 'Rahul Sharma' },
  { token: '{{order_id}}', description: 'Order reference number.', example: '1245' },
  { token: '{{app_name}}', description: 'Store or app branding name.', example: 'Shopiva' },
  { token: '{{expiry_date}}', description: 'Subscription or offer end date.', example: '2026-04-20' },
  { token: '{{status}}', description: 'New order or shipment status label.', example: 'Shipped' },
  { token: '{{build_id}}', description: 'Platform build job identifier.', example: 'bld-231' },
  { token: '{{reset_link}}', description: 'Password reset URL (email).', example: 'https://example.com/reset' },
];

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  sms: 'SMS', email: 'Email', push: 'Push', whatsapp: 'WhatsApp',
};

export type NotificationLogRow = {
  notificationId: string;
  templateId: string;
  templateName: string;
  channel: NotificationChannel;
  recipient: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  sentAt: string;
};

export function renderTemplateBody(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

export function renderEmailPreview(subject: string | null, body: string, vars: Record<string, string>) {
  return {
    subject: subject ? renderTemplateBody(subject, vars) : subject,
    body: renderTemplateBody(body, vars),
  };
}
