/**
 * Meta webhook bodies are heterogeneous; we keep parsing in `WhatsappInboundService`
 * with `WaWebhookPayload`. This DTO is reserved for future class-validator wiring.
 */
export type WhatsappWebhookBodyPlaceholder = Record<string, unknown>;
