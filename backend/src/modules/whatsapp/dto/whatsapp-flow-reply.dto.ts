/** Outbound UX from {@link WhatsappOrderFlowService.handleMessage}. */
export type WhatsappFlowReply =
  | { kind: 'text'; body: string }
  | {
      kind: 'buttons';
      body: string;
      buttons: Array<{ id: string; title: string }>;
      /** Merged into WhatsApp session `context_json` when inbound sends this reply. */
      contextPatch?: Record<string, unknown>;
    };
