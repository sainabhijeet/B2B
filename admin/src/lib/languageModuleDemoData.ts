/** In-memory demo — maps to languages, translation_keys, translations, tenant_translations. */

export type TextDirection = 'ltr' | 'rtl';

export type LanguageRow = {
  id: string;
  name: string;
  code: string;
  direction: TextDirection;
  status: 'active' | 'disabled';
  isDefault: boolean;
};

export type TranslationKeyRow = {
  key: string;
  module: string;
  description: string;
};

/** Flat map: translation key → locale code → string */
export type TranslationMap = Record<string, Record<string, string>>;

export type LanguageSettings = {
  defaultLanguageCode: string;
  fallbackLanguageCode: string;
  autoDetectLanguage: boolean;
  tenantLevelCustomization: boolean;
};

export type TenantOverrideDemo = {
  id: string;
  tenantName: string;
  tenantId: string;
  key: string;
  languageCode: string;
  value: string;
};

export const INITIAL_LANGUAGES: LanguageRow[] = [
  {
    id: 'lang-en',
    name: 'English',
    code: 'en',
    direction: 'ltr',
    status: 'active',
    isDefault: true,
  },
  {
    id: 'lang-hi',
    name: 'Hindi',
    code: 'hi',
    direction: 'ltr',
    status: 'active',
    isDefault: false,
  },
  {
    id: 'lang-fr',
    name: 'French',
    code: 'fr',
    direction: 'ltr',
    status: 'active',
    isDefault: false,
  },
  {
    id: 'lang-es',
    name: 'Spanish',
    code: 'es',
    direction: 'ltr',
    status: 'disabled',
    isDefault: false,
  },
  {
    id: 'lang-ar',
    name: 'Arabic',
    code: 'ar',
    direction: 'rtl',
    status: 'disabled',
    isDefault: false,
  },
  {
    id: 'lang-de',
    name: 'German',
    code: 'de',
    direction: 'ltr',
    status: 'disabled',
    isDefault: false,
  },
];

export const INITIAL_TRANSLATION_KEYS: TranslationKeyRow[] = [
  { key: 'home_title', module: 'General', description: 'Marketing home hero title' },
  { key: 'add_to_cart', module: 'Product', description: 'Primary CTA on product detail' },
  { key: 'checkout', module: 'Checkout', description: 'Checkout screen title / button' },
  { key: 'order_success', module: 'Checkout', description: 'Post-purchase confirmation' },
];

export const INITIAL_TRANSLATION_MAP: TranslationMap = {
  home_title: {
    en: 'Welcome home',
    hi: 'स्वागत है',
    fr: 'Bienvenue',
  },
  add_to_cart: {
    en: 'Add to Cart',
    hi: 'कार्ट में जोड़ें',
    fr: 'Ajouter au panier',
  },
  checkout: {
    en: 'Checkout',
    hi: 'चेकआउट',
    fr: 'Paiement',
  },
  order_success: {
    en: 'Order placed successfully',
    hi: 'ऑर्डर सफलतापूर्वक दर्ज हुआ',
    fr: 'Commande confirmée',
  },
};

export const INITIAL_LANGUAGE_SETTINGS: LanguageSettings = {
  defaultLanguageCode: 'en',
  fallbackLanguageCode: 'en',
  autoDetectLanguage: true,
  tenantLevelCustomization: true,
};

export const INITIAL_TENANT_OVERRIDES: TenantOverrideDemo[] = [
  {
    id: 'to-1',
    tenantId: 'tn-demo-boutique',
    tenantName: 'Demo Boutique',
    key: 'add_to_cart',
    languageCode: 'en',
    value: 'Buy now',
  },
];

export function cloneTranslationMap(m: TranslationMap): TranslationMap {
  const out: TranslationMap = {};
  for (const k of Object.keys(m)) {
    out[k] = { ...m[k] };
  }
  return out;
}
