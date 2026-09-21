export const ENTERPRISE_SUPPORTED_LANGUAGES = [
  'en',
  'hi',
  'zh',
  'ar',
  'fr',
  'de',
  'es',
  'gu',
  'ur',
  'ru',
  'ja',
] as const;

export type EnterpriseLanguageCode =
  (typeof ENTERPRISE_SUPPORTED_LANGUAGES)[number];

export const ENTERPRISE_RTL_LANGUAGES = new Set<string>(['ar', 'ur']);
