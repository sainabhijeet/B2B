export const SUPPORTED_LANGUAGES = ['en', 'hi', 'gu', 'ar', 'fr', 'es', 'de', 'ur', 'zh', 'ru', 'ja'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function resolveActiveLanguage(value: string | null | undefined, fallback: SupportedLanguage = 'en'): SupportedLanguage {
  const code = String(value ?? '').trim().toLowerCase().replace('_', '-').split('-')[0] as SupportedLanguage;
  if (!value || !String(value).trim()) return fallback;
  if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(code)) {
    throw new Error(`Unsupported storefront language: ${String(value)}`);
  }
  return code;
}

export function localeForLanguage(language: string | null | undefined): string {
  const code = resolveActiveLanguage(language);
  return code === 'en' ? 'en-IN' : code;
}

export function formatCurrency(value: number, language: string | null | undefined, currency = 'INR'): string {
  return new Intl.NumberFormat(localeForLanguage(language), { style: 'currency', currency }).format(value);
}

export function formatNumber(value: number, language: string | null | undefined): string {
  return new Intl.NumberFormat(localeForLanguage(language)).format(value);
}

export function formatDate(value: Date | string | number, language: string | null | undefined): string {
  return new Intl.DateTimeFormat(localeForLanguage(language), { dateStyle: 'medium' }).format(new Date(value));
}

export function detectMixedLanguage(values: string[], activeLanguage: string | null | undefined): { mixed: boolean; candidates: string[] } {
  const active = resolveActiveLanguage(activeLanguage);
  if (active === 'en') return { mixed: false, candidates: [] };
  const candidates = values.filter((value) => value.trim() && /[A-Za-z]/.test(value));
  return { mixed: candidates.length > 0, candidates };
}
