import type { WhatsappTemplateKey } from './mappings/whatsapp-template-mapping';
import { mapToMetaParams } from './mappings/whatsapp-template-mapping';

/** Replace `{{var}}` in tenant custom template text. */
export function renderCustomWhatsappTemplate(
  template: string,
  data: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, rawKey: string) => {
    const v = data[rawKey];
    return v != null ? String(v) : '';
  });
}

/** Ordered body strings for Meta `{{1}}`, `{{2}}`, … (same order as `mapToMetaParams`). */
export function mapDataToMetaBodyTexts(
  templateKey: WhatsappTemplateKey,
  data: Record<string, string>,
): string[] {
  return mapToMetaParams(templateKey, data).map((p) => p.text);
}
