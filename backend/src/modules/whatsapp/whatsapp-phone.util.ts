/** Build possible `customers.mobile` values from WhatsApp `messages[].from` (digits, often country + national). */
export function waFromToMobileCandidates(from: string): string[] {
  const d = from.replace(/\D/g, '');
  const out = new Set<string>();
  if (d.length >= 8 && d.length <= 20) out.add(d);
  if (d.length >= 10) out.add(d.slice(-10));
  if (d.startsWith('91') && d.length >= 12) out.add(d.slice(2));
  return [...out];
}
