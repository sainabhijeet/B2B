/** ISO 3166-1 alpha-2 → regional-indicator flag emoji (e.g. IN → 🇮🇳). Mirrors shared/iso-country-flag for admin-only checkouts. */
export function isoCodeToFlagEmoji(iso: string): string {
  const letters = (iso ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  const code = letters.length >= 2 ? letters.slice(0, 2) : "";
  if (!/^[A-Z]{2}$/.test(code)) return "";
  const base = 0x1f1e6 - 0x41;
  return String.fromCodePoint(base + code.charCodeAt(0), base + code.charCodeAt(1));
}
