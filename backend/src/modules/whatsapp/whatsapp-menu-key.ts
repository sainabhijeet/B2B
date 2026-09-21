/** Fixed keys for tenant WhatsApp main menu rows (labels are tenant-editable). */
export const WHATSAPP_TENANT_MENU_KEYS = [
  'ORDER',
  'REPEAT',
  'STATUS',
  'INVOICE',
  'CREDIT',
] as const;

export type WhatsappTenantMenuKey = (typeof WHATSAPP_TENANT_MENU_KEYS)[number];

export const WA_MENU_BUTTON_PREFIX = 'wa_m_';
/** Meta Cloud API interactive button title max length. */
export const WA_MENU_BUTTON_TITLE_MAX = 20;
export const WA_MENU_MORE_ID = `${WA_MENU_BUTTON_PREFIX}MORE`;

export function whatsappMenuButtonId(key: WhatsappTenantMenuKey): string {
  return `${WA_MENU_BUTTON_PREFIX}${key}`;
}

export function parseWhatsappMenuButtonId(raw: string): WhatsappTenantMenuKey | 'MORE' | null {
  const t = raw.trim();
  if (!t.startsWith(WA_MENU_BUTTON_PREFIX)) return null;
  const rest = t.slice(WA_MENU_BUTTON_PREFIX.length);
  if (rest === 'MORE') return 'MORE';
  if ((WHATSAPP_TENANT_MENU_KEYS as readonly string[]).includes(rest)) {
    return rest as WhatsappTenantMenuKey;
  }
  return null;
}

export function isUnknownWhatsappMenuButtonId(raw: string): boolean {
  const t = raw.trim();
  return t.startsWith(WA_MENU_BUTTON_PREFIX) && parseWhatsappMenuButtonId(t) === null;
}
