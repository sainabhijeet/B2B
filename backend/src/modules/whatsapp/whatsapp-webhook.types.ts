/** Subset of Meta Cloud API webhook JSON we handle. */
export type WaWebhookMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
};

export type WaWebhookValue = {
  messaging_product?: string;
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  messages?: WaWebhookMessage[];
  /** Delivery / read receipts — not user text. */
  statuses?: unknown[];
};

export type WaWebhookChange = {
  field?: string;
  value?: WaWebhookValue;
};

export type WaWebhookEntry = {
  id?: string;
  changes?: WaWebhookChange[];
};

export type WaWebhookPayload = {
  object?: string;
  entry?: WaWebhookEntry[];
};
