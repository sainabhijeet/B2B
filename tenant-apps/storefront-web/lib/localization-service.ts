import {
  formatCurrency,
  formatDate,
  formatNumber,
  resolveActiveLanguage,
  type SupportedLanguage,
} from "@/lib/language-consistency";
import { loadThemeLocale } from "@/engine/template-loader";
import {
  collectMissingTranslationKeys,
  storefrontTextDirection,
  translateText,
} from "@/engine/template-language";

export type LocaleDictionary = Record<string, string>;

export type StorefrontLanguageContext = {
  languageCode: SupportedLanguage;
  locale: string;
  direction: "ltr" | "rtl";
  revision: number;
};

export type StorefrontLoadedLocale = {
  languageCode: SupportedLanguage;
  dictionary: LocaleDictionary;
  revision: number;
  missingKeys: string[];
};

type LocaleCacheEntry = {
  expiresAt: number;
  value: StorefrontLoadedLocale;
};

const localeCache = new Map<string, LocaleCacheEntry>();
const revisions = new Map<string, number>();
const DEFAULT_CACHE_TTL_MS = 300_000;

function localeForLanguage(language: SupportedLanguage): string {
  return language === "en" ? "en-IN" : language;
}

function revisionFor(scope: string): number {
  return revisions.get(scope) ?? 0;
}

function cacheTtlMs(): number {
  const parsed = Number.parseInt(process.env.NEXT_PUBLIC_LOCALE_CACHE_TTL_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CACHE_TTL_MS;
}

export function createLanguageContext(
  languageCode: string | null | undefined,
  options: { revision?: number } = {},
): StorefrontLanguageContext {
  const resolved = resolveActiveLanguage(languageCode);
  return {
    languageCode: resolved,
    locale: localeForLanguage(resolved),
    direction: storefrontTextDirection(resolved),
    revision: options.revision ?? 0,
  };
}

export function invalidateLocalizationCache(scope = "storefront"): number {
  const revision = revisionFor(scope) + 1;
  revisions.set(scope, revision);
  for (const key of localeCache.keys()) {
    if (key.startsWith(`${scope}:`)) localeCache.delete(key);
  }
  return revision;
}

export async function loadLocale(options: {
  languageCode: string | null | undefined;
  manifestPath?: string | null;
  manifest?: Record<string, unknown> | null;
  scope?: string;
}): Promise<StorefrontLoadedLocale> {
  const scope = options.scope ?? "storefront";
  const languageCode = resolveActiveLanguage(options.languageCode);
  const revision = revisionFor(scope);
  const manifestKey = options.manifestPath ?? "no-theme";
  const cacheKey = `${scope}:locale:${revision}:${languageCode}:${manifestKey}`;
  const cached = localeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) localeCache.delete(cacheKey);

  const dictionary = await loadThemeLocale(
    options.manifestPath,
    options.manifest ?? null,
    languageCode,
  );
  const loaded: StorefrontLoadedLocale = {
    languageCode,
    dictionary,
    revision,
    missingKeys: [],
  };
  localeCache.set(cacheKey, {
    value: loaded,
    expiresAt: Date.now() + cacheTtlMs(),
  });
  return loaded;
}

export class LocalizationService {
  constructor(
    private readonly context: StorefrontLanguageContext,
    private readonly locale: StorefrontLoadedLocale | LocaleDictionary = {},
  ) {}

  currentLanguage(): SupportedLanguage {
    return this.context.languageCode;
  }

  direction(): "ltr" | "rtl" {
    return this.context.direction;
  }

  translate(key: string): string {
    return translateText(key, this.context.languageCode, this.dictionary());
  }

  t(key: string): string {
    return this.translate(key);
  }

  missing(keysOrTemplate: string[] | unknown): string[] {
    if (Array.isArray(keysOrTemplate)) {
      const dictionary = this.dictionary();
      return [...new Set(keysOrTemplate)].filter((key) => !dictionary[key]?.trim());
    }
    return collectMissingTranslationKeys(keysOrTemplate, this.context.languageCode);
  }

  formatCurrency(value: number, currency = "INR"): string {
    return formatCurrency(value, this.context.languageCode, currency);
  }

  formatNumber(value: number): string {
    return formatNumber(value, this.context.languageCode);
  }

  formatDate(value: Date | string | number): string {
    return formatDate(value, this.context.languageCode);
  }

  private dictionary(): LocaleDictionary {
    const candidate = this.locale as Partial<StorefrontLoadedLocale>;
    return candidate.dictionary &&
      typeof candidate.dictionary === "object" &&
      !Array.isArray(candidate.dictionary)
      ? candidate.dictionary
      : (this.locale as LocaleDictionary);
  }
}

export async function createLocalizationService(options: {
  languageCode: string | null | undefined;
  manifestPath?: string | null;
  manifest?: Record<string, unknown> | null;
  scope?: string;
}): Promise<LocalizationService> {
  const scope = options.scope ?? "storefront";
  const context = createLanguageContext(options.languageCode, {
    revision: revisionFor(scope),
  });
  const locale = await loadLocale({ ...options, scope });
  return new LocalizationService(context, locale);
}
