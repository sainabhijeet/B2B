/**
 * System-controlled mapping: logical template key → Meta-registered template `name`
 * (must match rows synced into `tenant_whatsapp_meta_templates.template_name`).
 */
export const TEMPLATE_KEY_TO_META = {
  ORDER_CONFIRM: 'order_update',
  ORDER_DISPATCH: 'order_dispatch',
  OTP: 'otp_template',
  PAYMENT_REMINDER: 'payment_reminder',
} as const;

export type WhatsappTemplateKey = keyof typeof TEMPLATE_KEY_TO_META;

/** Platform default Meta `name` when tenant has no row in `tenant_whatsapp_template_mapping`. */
export function metaTemplateNameForKey(templateKey: WhatsappTemplateKey): string {
  return TEMPLATE_KEY_TO_META[templateKey];
}

/** Last-resort Meta name guess (e.g. `ORDER_CONFIRM` → `order_confirm`). */
export function metaTemplateNameLowerKey(templateKey: WhatsappTemplateKey): string {
  return templateKey.toLowerCase();
}

export type MetaTextParameter = { type: 'text'; text: string };

/** Maps tenant `data` fields → Meta Cloud API body `parameters` ({{1}}, {{2}}, … in array order). */
export function mapToMetaParams(
  templateKey: WhatsappTemplateKey,
  data: Record<string, string>,
): MetaTextParameter[] {
  switch (templateKey) {
    case 'ORDER_CONFIRM':
      return [
        { type: 'text', text: String(data.customer_name ?? '') },
        { type: 'text', text: String(data.order_id ?? '') },
      ];
    case 'ORDER_DISPATCH':
      return [
        { type: 'text', text: String(data.customer_name ?? '') },
        { type: 'text', text: String(data.order_id ?? '') },
      ];
    case 'OTP':
      return [{ type: 'text', text: String(data.otp ?? data.otp_code ?? '') }];
    case 'PAYMENT_REMINDER':
      return [
        { type: 'text', text: String(data.customer_name ?? '') },
        { type: 'text', text: String(data.invoice_number ?? '') },
        { type: 'text', text: String(data.amount_due ?? '') },
      ];
    default: {
      const _exhaustive: never = templateKey;
      return _exhaustive;
    }
  }
}
