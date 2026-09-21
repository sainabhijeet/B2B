import type { ConfigService } from '@nestjs/config';

type GraphPhoneFields = {
  id?: string;
  whatsapp_business_account?: { id?: string };
  error?: { message?: string };
};

export type ResolveWabaFromPhoneResult = {
  wabaId: string | null;
  graphStatus: number;
  graphMessage?: string;
};

/**
 * Cloud API: `GET /{PHONE_NUMBER_ID}?fields=whatsapp_business_account{id}` when WABA is not stored yet.
 * On Graph errors, returns `graphStatus` / `graphMessage` so callers can surface e.g. expired tokens (401/190).
 */
export async function resolveWabaIdFromPhoneNumberId(
  config: ConfigService,
  phoneNumberId: string,
  token: string,
): Promise<ResolveWabaFromPhoneResult> {
  const pid = phoneNumberId.trim();
  if (!pid || !token.trim()) {
    return {
      wabaId: null,
      graphStatus: 0,
      graphMessage: 'Missing phone number id or access token.',
    };
  }
  const v = config.get<string>('whatsapp.apiVersion', 'v19.0');
  const url = `https://graph.facebook.com/${v}/${encodeURIComponent(pid)}?fields=id,whatsapp_business_account{id}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token.trim()}` } });
  const body = (await res.json()) as GraphPhoneFields;
  if (!res.ok) {
    const msg = body?.error?.message?.trim() || `Meta returned HTTP ${res.status}.`;
    return { wabaId: null, graphStatus: res.status, graphMessage: msg.slice(0, 2000) };
  }
  const id = body.whatsapp_business_account?.id;
  if (typeof id === 'string' && id.trim()) {
    return { wabaId: id.trim(), graphStatus: res.status };
  }
  return {
    wabaId: null,
    graphStatus: res.status,
    graphMessage:
      'Meta did not return whatsapp_business_account.id for this phone number id. Use a System User / app token with WhatsApp permissions, or set WABA manually in Platform → WhatsApp.',
  };
}
