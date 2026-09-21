import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Repository } from 'typeorm';
import { TenantAppSettings } from '../entities/tenant-app-settings.entity';
import {
  ENTERPRISE_RTL_LANGUAGES,
  ENTERPRISE_SUPPORTED_LANGUAGES,
  type EnterpriseLanguageCode,
} from './localization.constants';

export type LocaleDictionary = Record<string, string>;

export type LanguageContext = {
  tenantId: string;
  languageCode: EnterpriseLanguageCode;
  locale: string;
  direction: 'ltr' | 'rtl';
  revision: number;
};

export type LoadedLocale = {
  languageCode: EnterpriseLanguageCode;
  dictionary: LocaleDictionary;
  missingKeys: string[];
  loadedFiles: string[];
  revision: number;
};

type CachedLocale = {
  expiresAt: number;
  value: LoadedLocale;
};

@Injectable()
export class LocalizationService {
  private readonly log = new Logger(LocalizationService.name);
  private readonly languageCache = new Map<
    string,
    { expiresAt: number; value: EnterpriseLanguageCode }
  >();
  private readonly localeCache = new Map<string, CachedLocale>();
  private readonly revisions = new Map<string, number>();

  constructor(
    @InjectRepository(TenantAppSettings)
    private readonly settingsRepo: Repository<TenantAppSettings>,
    private readonly config: ConfigService,
  ) {}

  supportedLanguages(): EnterpriseLanguageCode[] {
    return [...ENTERPRISE_SUPPORTED_LANGUAGES];
  }

  resolveLanguage(
    value: string | null | undefined,
    fallback: EnterpriseLanguageCode = 'en',
  ): EnterpriseLanguageCode {
    const candidate = this.normalizedCandidate(value);
    if (!candidate) return fallback;
    return this.supportedLanguages().includes(
      candidate as EnterpriseLanguageCode,
    )
      ? (candidate as EnterpriseLanguageCode)
      : fallback;
  }

  assertSupported(value: string | null | undefined): EnterpriseLanguageCode {
    const candidate = this.normalizedCandidate(value);
    if (
      !candidate ||
      !this.supportedLanguages().includes(candidate as EnterpriseLanguageCode)
    ) {
      throw new BadRequestException(
        `Unsupported language: ${String(value ?? '')}`,
      );
    }
    return candidate as EnterpriseLanguageCode;
  }

  localeForLanguage(language: string | null | undefined): string {
    const code = this.resolveLanguage(language);
    return code === 'en' ? 'en-IN' : code;
  }

  isRtl(language: string | null | undefined): boolean {
    return ENTERPRISE_RTL_LANGUAGES.has(this.resolveLanguage(language));
  }

  direction(language: string | null | undefined): 'ltr' | 'rtl' {
    return this.isRtl(language) ? 'rtl' : 'ltr';
  }

  getRevision(scope: string): number {
    return this.revisions.get(scope) ?? 0;
  }

  invalidate(scope: string): number {
    const revision = this.getRevision(scope) + 1;
    this.revisions.set(scope, revision);
    for (const key of this.languageCache.keys()) {
      if (key.startsWith(`${scope}:`)) this.languageCache.delete(key);
    }
    for (const key of this.localeCache.keys()) {
      if (key.startsWith(`${scope}:`)) this.localeCache.delete(key);
    }
    return revision;
  }

  async currentLanguage(tenantId: string): Promise<EnterpriseLanguageCode> {
    const scope = this.scopeForTenant(tenantId);
    const cached = this.readCachedLanguage(scope);
    if (cached) return cached;
    const row = await this.settingsRepo.findOne({
      where: { tenantId },
      select: ['selectedLanguageCode'],
    });
    const language = this.resolveLanguage(row?.selectedLanguageCode ?? 'en');
    this.cacheLanguage(scope, language);
    return language;
  }

  async languageContext(tenantId: string): Promise<LanguageContext> {
    const languageCode = await this.currentLanguage(tenantId);
    const scope = this.scopeForTenant(tenantId);
    return {
      tenantId,
      languageCode,
      locale: this.localeForLanguage(languageCode),
      direction: this.direction(languageCode),
      revision: this.getRevision(scope),
    };
  }

  async setCurrentLanguage(
    tenantId: string,
    language: string,
  ): Promise<LanguageContext> {
    const languageCode = this.assertSupported(language);
    await this.settingsRepo.upsert(
      { tenantId, selectedLanguageCode: languageCode },
      ['tenantId'],
    );
    const scope = this.scopeForTenant(tenantId);
    this.invalidate(scope);
    this.cacheLanguage(scope, languageCode);
    return this.languageContext(tenantId);
  }

  async loadLocale(options: {
    tenantId?: string | null;
    languageCode: string;
    themeRoot?: string | null;
    namespace?: string | null;
  }): Promise<LoadedLocale> {
    const languageCode = this.resolveLanguage(options.languageCode);
    const scope = options.tenantId
      ? this.scopeForTenant(options.tenantId)
      : 'platform';
    const revision = this.getRevision(scope);
    const namespace = options.namespace?.trim() || 'runtime';
    const themeRoot = options.themeRoot?.trim() || '';
    const cacheKey = `${scope}:locale:${revision}:${namespace}:${themeRoot}:${languageCode}`;
    const cached = this.readCachedLocale(cacheKey);
    if (cached) return cached;

    const common = await this.loadCommonLocale(languageCode);
    const theme = themeRoot
      ? await this.loadThemeLocale(themeRoot, languageCode)
      : { dictionary: {}, loadedFiles: [] };
    const english =
      languageCode === 'en'
        ? { dictionary: {}, loadedFiles: [] }
        : await this.loadCommonLocale('en');
    const themeEnglish =
      languageCode === 'en' || !themeRoot
        ? { dictionary: {}, loadedFiles: [] }
        : await this.loadThemeLocale(themeRoot, 'en');

    const dictionary = {
      ...english.dictionary,
      ...themeEnglish.dictionary,
      ...common.dictionary,
      ...theme.dictionary,
    };
    const missingKeys = Object.keys({
      ...english.dictionary,
      ...themeEnglish.dictionary,
    }).filter((key) => !dictionary[key]?.trim());
    const loaded: LoadedLocale = {
      languageCode,
      dictionary,
      missingKeys,
      loadedFiles: [
        ...english.loadedFiles,
        ...themeEnglish.loadedFiles,
        ...common.loadedFiles,
        ...theme.loadedFiles,
      ],
      revision,
    };
    this.localeCache.set(cacheKey, {
      value: loaded,
      expiresAt: Date.now() + this.cacheTtlMs(),
    });
    return loaded;
  }

  translate(
    key: string,
    locale: LoadedLocale | LocaleDictionary,
    options: { defaultValue?: string } = {},
  ): string {
    const dictionary = this.dictionaryFrom(locale);
    const value = dictionary[key];
    if (typeof value === 'string' && value.trim()) return value;
    return options.defaultValue ?? key;
  }

  t(
    key: string,
    locale: LoadedLocale | LocaleDictionary,
    options: { defaultValue?: string } = {},
  ): string {
    return this.translate(key, locale, options);
  }

  missingTranslations(
    requiredKeys: string[],
    locale: LoadedLocale | LocaleDictionary,
  ): string[] {
    const dictionary = this.dictionaryFrom(locale);
    return [...new Set(requiredKeys)].filter((key) => !dictionary[key]?.trim());
  }

  formatCurrency(value: number, language: string, currency = 'INR'): string {
    return new Intl.NumberFormat(this.localeForLanguage(language), {
      style: 'currency',
      currency,
    }).format(value);
  }

  formatNumber(value: number, language: string): string {
    return new Intl.NumberFormat(this.localeForLanguage(language)).format(
      value,
    );
  }

  formatDate(value: Date | string | number, language: string): string {
    return new Intl.DateTimeFormat(this.localeForLanguage(language), {
      dateStyle: 'medium',
    }).format(new Date(value));
  }

  private cacheLanguage(scope: string, language: EnterpriseLanguageCode): void {
    this.languageCache.set(`${scope}:language`, {
      value: language,
      expiresAt: Date.now() + this.cacheTtlMs(),
    });
  }

  private readCachedLanguage(scope: string): EnterpriseLanguageCode | null {
    const key = `${scope}:language`;
    const cached = this.languageCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      this.languageCache.delete(key);
      return null;
    }
    return cached.value;
  }

  private readCachedLocale(cacheKey: string): LoadedLocale | null {
    const cached = this.localeCache.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      this.localeCache.delete(cacheKey);
      return null;
    }
    return cached.value;
  }

  private async loadCommonLocale(language: EnterpriseLanguageCode): Promise<{
    dictionary: LocaleDictionary;
    loadedFiles: string[];
  }> {
    const root = this.config.get<string>(
      'localization.commonLocalesDir',
      path.resolve(process.cwd(), 'storage', 'locales'),
    );
    return this.loadLocaleFile(path.join(root, `${language}.json`));
  }

  private async loadThemeLocale(
    themeRoot: string,
    language: EnterpriseLanguageCode,
  ): Promise<{ dictionary: LocaleDictionary; loadedFiles: string[] }> {
    return this.loadLocaleFile(
      path.join(themeRoot, 'locales', `${language}.json`),
    );
  }

  private async loadLocaleFile(file: string): Promise<{
    dictionary: LocaleDictionary;
    loadedFiles: string[];
  }> {
    try {
      const raw = await fs.readFile(file, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      return {
        dictionary: this.flattenLocale(parsed),
        loadedFiles: [file],
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        this.log.warn(`Locale file rejected: ${file}`);
      }
      return { dictionary: {}, loadedFiles: [] };
    }
  }

  private flattenLocale(value: unknown, prefix = ''): LocaleDictionary {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: LocaleDictionary = {};
    for (const [key, child] of Object.entries(value)) {
      const nextKey = prefix ? `${prefix}.${key}` : key;
      if (typeof child === 'string') {
        out[nextKey] = child;
      } else if (child && typeof child === 'object' && !Array.isArray(child)) {
        Object.assign(out, this.flattenLocale(child, nextKey));
      }
    }
    return out;
  }

  private cacheTtlMs(): number {
    return this.config.get<number>(
      'themeLanguageConsistency.cacheTtlMs',
      300000,
    );
  }

  private scopeForTenant(tenantId: string): string {
    return `tenant:${tenantId}`;
  }

  private normalizedCandidate(value: string | null | undefined): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace('_', '-')
      .split('-')[0];
  }

  private dictionaryFrom(
    locale: LoadedLocale | LocaleDictionary,
  ): LocaleDictionary {
    const candidate = locale as Partial<LoadedLocale>;
    return candidate.dictionary &&
      typeof candidate.dictionary === 'object' &&
      !Array.isArray(candidate.dictionary)
      ? candidate.dictionary
      : (locale as LocaleDictionary);
  }
}
