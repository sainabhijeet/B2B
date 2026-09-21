import type { WhatsappHybridTemplateKey } from './whatsapp-hybrid-template-key';

/** Product / worker events that map 1:1 to hybrid template keys for outbound sends. */
export type WhatsappOutboundNotificationEvent = WhatsappHybridTemplateKey;

export function outboundEventToTemplateKey(
  event: WhatsappOutboundNotificationEvent,
): WhatsappHybridTemplateKey {
  return event;
}
