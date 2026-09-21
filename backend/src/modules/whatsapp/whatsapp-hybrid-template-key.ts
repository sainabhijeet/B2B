import type { WhatsappTemplateKey } from './mappings/whatsapp-template-mapping';

/** Keys supported by hybrid custom + Meta template flows (must match `TEMPLATE_KEY_TO_META`). */
export const WHATSAPP_HYBRID_TEMPLATE_KEYS = [
  'ORDER_CONFIRM',
  'ORDER_DISPATCH',
  'OTP',
  'PAYMENT_REMINDER',
] as const satisfies readonly WhatsappTemplateKey[];

export type WhatsappHybridTemplateKey = (typeof WHATSAPP_HYBRID_TEMPLATE_KEYS)[number];
