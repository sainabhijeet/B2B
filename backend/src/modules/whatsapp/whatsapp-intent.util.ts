export type WhatsappIntent = 'STATUS' | 'INVOICE' | 'HELP' | 'CREDIT' | 'UNKNOWN';

/** First word, letters/digits only (handles "Hi!", "hello…"). */
function firstGreetingToken(text: string): string {
  const raw = text.trim().split(/\s+/)[0] ?? '';
  return raw.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

/**
 * Flexible keyword intents (WhatsApp users rarely type exact commands).
 * Order: greetings → status → invoice/bill → help/menu.
 */
export function detectWhatsappIntent(text: string): WhatsappIntent {
  const t = (text ?? '').trim().toLowerCase();
  if (!t) return 'UNKNOWN';

  const greet = firstGreetingToken(t);
  if (['hi', 'hello', 'hey', 'hii', 'namaste', 'hlw', 'yo'].includes(greet)) {
    return 'HELP';
  }

  if (t === 'credit' || /\bcredit\b/.test(t) || /\bbalance\b/.test(t) || /\blimit\b/.test(t)) {
    return 'CREDIT';
  }

  if (t.includes('status')) return 'STATUS';

  if (t.includes('invoice') || /\bbill\b/i.test(t)) return 'INVOICE';

  if (t.includes('help') || /\bmenu\b/i.test(t)) return 'HELP';

  return 'UNKNOWN';
}

export const DEFAULT_HELP_COMMANDS =
  'Commands: status — latest order; invoice or bill — latest invoice; credit — limit & balance (if enabled); help or menu — buttons. Say hi / hello anytime.';
