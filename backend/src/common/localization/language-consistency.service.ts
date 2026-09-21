import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENTERPRISE_SUPPORTED_LANGUAGES } from './localization.constants';

export type TranslationCoverageReport = {
  schemaVersion: 1;
  activeLanguage: string;
  requiredLanguages: string[];
  totalKeys: number;
  translatedKeys: number;
  missing: Array<{ language: string; key: string }>;
  mixedLanguageCandidates: Array<{ language: string; key: string }>;
  completeness: number;
  readyForPublish: boolean;
  generatedAt: string;
};

const SUPPORTED_LANGUAGES = new Set<string>(ENTERPRISE_SUPPORTED_LANGUAGES);

@Injectable()
export class LanguageConsistencyService {
  private readonly revisions = new Map<string, number>();
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: string }
  >();

  constructor(private readonly config: ConfigService) {}

  resolve(value: string | null | undefined, fallback = 'en'): string {
    const candidate = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace('_', '-')
      .split('-')[0];
    return SUPPORTED_LANGUAGES.has(candidate) ? candidate : fallback;
  }

  assertSupported(value: string | null | undefined): string {
    const candidate = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace('_', '-')
      .split('-')[0];
    if (!SUPPORTED_LANGUAGES.has(candidate)) {
      throw new BadRequestException(
        `Unsupported language: ${String(value ?? '')}`,
      );
    }
    return candidate;
  }

  getRevision(scope: string): number {
    return this.revisions.get(scope) ?? 0;
  }

  invalidate(scope: string): number {
    const revision = this.getRevision(scope) + 1;
    this.revisions.set(scope, revision);
    for (const key of this.cache.keys())
      if (key.startsWith(`${scope}:`)) this.cache.delete(key);
    return revision;
  }

  cacheLanguage(scope: string, language: string): string {
    const key = `${scope}:language`;
    const value = this.resolve(language);
    this.cache.set(key, {
      value,
      expiresAt:
        Date.now() +
        this.config.get<number>('themeLanguageConsistency.cacheTtlMs', 300000),
    });
    return value;
  }

  readCachedLanguage(scope: string): string | null {
    const item = this.cache.get(`${scope}:language`);
    if (!item || item.expiresAt <= Date.now()) {
      this.cache.delete(`${scope}:language`);
      return null;
    }
    return item.value;
  }

  coverage(
    activeLanguage: string,
    base: Record<string, string>,
    translations: Record<string, Record<string, string>>,
    requiredLanguages = [activeLanguage],
  ): TranslationCoverageReport {
    const active = this.resolve(activeLanguage);
    const languages = [
      ...new Set(requiredLanguages.map((language) => this.resolve(language))),
    ];
    const keys = Object.keys(base);
    const missing: Array<{ language: string; key: string }> = [];
    const mixedLanguageCandidates: Array<{ language: string; key: string }> =
      [];
    for (const language of languages) {
      const dictionary = translations[language] ?? {};
      for (const key of keys) {
        const value = dictionary[key];
        if (!value || !value.trim()) missing.push({ language, key });
        if (language !== 'en' && value === base[key])
          mixedLanguageCandidates.push({ language, key });
      }
    }
    const totalKeys = keys.length * Math.max(languages.length, 1);
    const translatedKeys = Math.max(0, totalKeys - missing.length);
    return {
      schemaVersion: 1,
      activeLanguage: active,
      requiredLanguages: languages,
      totalKeys,
      translatedKeys,
      missing,
      mixedLanguageCandidates,
      completeness: totalKeys
        ? Math.round((translatedKeys / totalKeys) * 100)
        : 100,
      readyForPublish:
        missing.length === 0 && mixedLanguageCandidates.length === 0,
      generatedAt: new Date().toISOString(),
    };
  }

  formatCurrency(value: number, language: string, currency: string): string {
    return new Intl.NumberFormat(this.resolve(language), {
      style: 'currency',
      currency,
    }).format(value);
  }

  formatNumber(value: number, language: string): string {
    return new Intl.NumberFormat(this.resolve(language)).format(value);
  }

  formatDate(value: Date | string | number, language: string): string {
    return new Intl.DateTimeFormat(this.resolve(language), {
      dateStyle: 'medium',
    }).format(new Date(value));
  }
}
