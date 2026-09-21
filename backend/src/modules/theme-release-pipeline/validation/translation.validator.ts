import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ENTERPRISE_SUPPORTED_LANGUAGES } from '../../../common/localization/localization.constants';
import { issue, ValidationIssue } from './validation-report.types';

export type TranslationValidation = {
  coverage: {
    schemaVersion: 2;
    activeLanguage: string;
    requiredLanguages: string[];
    declaredLanguages: string[];
    totalKeys: number;
    translatedKeys: number;
    completeness: number;
    parityPercent: number;
    missingLocales: string[];
    invalidJson: Array<{ language: string; path: string; error: string }>;
    missing: Array<{ language: string; key: string }>;
    extraKeys: Array<{ language: string; key: string }>;
    brokenNamespaces: Array<{ language: string; key: string; value: string }>;
    mixedLanguageCandidates: Array<{ language: string; key: string }>;
    readyForPublish: boolean;
    blockers: string[];
    generatedAt: string;
  };
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

function flatten(
  value: unknown,
  prefix = '',
  target: Record<string, string> = {},
): Record<string, string> {
  if (typeof value === 'string') target[prefix] = value;
  else if (value && typeof value === 'object' && !Array.isArray(value))
    Object.entries(value).forEach(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key, target),
    );
  return target;
}

async function readLocale(
  root: string,
  language: string,
): Promise<{
  dictionary: Record<string, string> | null;
  path: string | null;
  invalidJson: string | null;
}> {
  for (const directory of ['locales', 'translations', 'i18n']) {
    const localePath = path.join(root, directory, `${language}.json`);
    let raw: string;
    try {
      raw = await fs.readFile(localePath, 'utf8');
    } catch {
      // Try the next supported package layout.
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
          dictionary: null,
          path: localePath,
          invalidJson: 'Locale JSON root must be an object.',
        };
      }
      return {
        dictionary: flatten(parsed),
        path: localePath,
        invalidJson: null,
      };
    } catch (error) {
      return {
        dictionary: null,
        path: localePath,
        invalidJson:
          error instanceof Error ? error.message : 'Locale JSON is invalid.',
      };
    }
  }
  return { dictionary: null, path: null, invalidJson: null };
}

function languageKey(value: string): string {
  return value.trim().toLowerCase().replace('_', '-').split('-')[0];
}

function declaredLanguagesFromManifest(
  manifest: Record<string, unknown>,
): string[] {
  const declared = manifest.languages ?? manifest.locales;
  if (!Array.isArray(declared)) return [];
  return [
    ...new Set(
      declared
        .filter((item): item is string => typeof item === 'string')
        .map(languageKey)
        .filter(Boolean),
    ),
  ];
}

function isNamespaceLeak(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^⟦[^⟧]+⟧$/u.test(v)) return true;
  if (/^\[[a-z0-9_.-]+\]$/iu.test(v)) return true;
  return /^[a-z][a-z0-9_-]*(?:\.[a-z0-9_-]+){2,}$/iu.test(v);
}

export function translationCoverageBlockers(
  coverage: Record<string, unknown> | null | undefined,
): string[] {
  if (!coverage) return ['TRANSLATION_COVERAGE_MISSING'];
  const blockers: string[] = [];
  const ready = coverage.readyForPublish === true;
  const completeness = Number(
    coverage.completeness ?? coverage.coveragePercent ?? 0,
  );
  const parity = Number(coverage.parityPercent ?? completeness);
  const missingLocales = Array.isArray(coverage.missingLocales)
    ? coverage.missingLocales.length
    : 0;
  const invalidJson = Array.isArray(coverage.invalidJson)
    ? coverage.invalidJson.length
    : 0;
  const missing = Array.isArray(coverage.missing) ? coverage.missing.length : 0;
  const brokenNamespaces = Array.isArray(coverage.brokenNamespaces)
    ? coverage.brokenNamespaces.length
    : 0;
  if (!ready) blockers.push('TRANSLATION_NOT_READY');
  if (completeness !== 100) blockers.push('TRANSLATION_COVERAGE_BELOW_100');
  if (parity !== 100) blockers.push('LOCALE_PARITY_BELOW_100');
  if (missingLocales) blockers.push('MISSING_LOCALE');
  if (invalidJson) blockers.push('INVALID_LOCALE_JSON');
  if (missing) blockers.push('MISSING_TRANSLATION_KEY');
  if (brokenNamespaces) blockers.push('BROKEN_NAMESPACE');
  return [...new Set(blockers)];
}

export function isTranslationCoveragePublishable(
  coverage: Record<string, unknown> | null | undefined,
): boolean {
  return translationCoverageBlockers(coverage).length === 0;
}

export async function validateTranslations(
  root: string,
  manifest: Record<string, unknown>,
): Promise<TranslationValidation> {
  const declaredLanguages = declaredLanguagesFromManifest(manifest);
  const requiredLanguages = [...ENTERPRISE_SUPPORTED_LANGUAGES];
  const activeLanguage =
    typeof manifest.defaultLanguage === 'string'
      ? languageKey(manifest.defaultLanguage)
      : 'en';
  const baseResult = await readLocale(root, 'en');
  const base = baseResult.dictionary ?? {};
  const missing: Array<{ language: string; key: string }> = [];
  const extraKeys: Array<{ language: string; key: string }> = [];
  const missingLocales: string[] = [];
  const invalidJson: Array<{ language: string; path: string; error: string }> =
    [];
  const brokenNamespaces: Array<{
    language: string;
    key: string;
    value: string;
  }> = [];
  const mixedLanguageCandidates: Array<{ language: string; key: string }> = [];
  if (!baseResult.dictionary) {
    missingLocales.push('en');
    if (baseResult.invalidJson) {
      invalidJson.push({
        language: 'en',
        path: baseResult.path ?? 'locales/en.json',
        error: baseResult.invalidJson,
      });
    }
  }
  for (const language of requiredLanguages) {
    const result =
      language === 'en' ? baseResult : await readLocale(root, language);
    const dictionary = result.dictionary;
    if (!dictionary) {
      missingLocales.push(language);
      if (result.invalidJson) {
        invalidJson.push({
          language,
          path: result.path ?? `locales/${language}.json`,
          error: result.invalidJson,
        });
      }
      for (const key of Object.keys(base)) missing.push({ language, key });
      if (!Object.keys(base).length)
        missing.push({ language, key: `__locale_file__:${language}` });
      continue;
    }
    for (const key of Object.keys(base)) {
      if (!dictionary[key]?.trim()) missing.push({ language, key });
      if (language !== 'en' && dictionary[key] === base[key])
        mixedLanguageCandidates.push({ language, key });
    }
    for (const [key, value] of Object.entries(dictionary)) {
      if (!base[key]) extraKeys.push({ language, key });
      if (isNamespaceLeak(value)) {
        brokenNamespaces.push({ language, key, value });
      }
    }
  }
  const keys = Object.keys(base);
  const totalKeys = keys.length * Math.max(requiredLanguages.length, 1);
  const translatedKeys = Math.max(0, totalKeys - missing.length);
  const completeness = totalKeys
    ? Math.round((translatedKeys / totalKeys) * 100)
    : 0;
  const parityPercent =
    missing.length === 0 &&
    missingLocales.length === 0 &&
    invalidJson.length === 0 &&
    brokenNamespaces.length === 0
      ? 100
      : Math.min(completeness, 99);
  const coverage = {
    schemaVersion: 2 as const,
    activeLanguage,
    requiredLanguages,
    declaredLanguages,
    totalKeys,
    translatedKeys,
    completeness,
    parityPercent,
    missingLocales: [...new Set(missingLocales)],
    invalidJson,
    missing,
    extraKeys,
    brokenNamespaces,
    mixedLanguageCandidates,
    readyForPublish: false,
    blockers: [] as string[],
    generatedAt: new Date().toISOString(),
  };
  coverage.readyForPublish =
    coverage.parityPercent === 100 &&
    coverage.missingLocales.length === 0 &&
    coverage.invalidJson.length === 0 &&
    coverage.missing.length === 0 &&
    coverage.brokenNamespaces.length === 0 &&
    coverage.mixedLanguageCandidates.length === 0;
  coverage.blockers = translationCoverageBlockers(coverage);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (missingLocales.length)
    errors.push(
      issue(
        'MISSING_LOCALE',
        'ERROR',
        `Missing locale files: ${[...new Set(missingLocales)].join(', ')}.`,
        'locales',
      ),
    );
  if (invalidJson.length)
    errors.push(
      issue(
        'INVALID_LOCALE_JSON',
        'ERROR',
        `${invalidJson.length} locale file(s) contain invalid JSON.`,
        'locales',
      ),
    );
  if (missing.length)
    errors.push(
      issue(
        'MISSING_TRANSLATION_KEY',
        'ERROR',
        `${missing.length} required translations are missing.`,
        'locales',
      ),
    );
  if (brokenNamespaces.length)
    errors.push(
      issue(
        'BROKEN_NAMESPACE',
        'ERROR',
        `${brokenNamespaces.length} translation value(s) render unresolved namespace markers.`,
        'locales',
      ),
    );
  if (parityPercent !== 100)
    errors.push(
      issue(
        'LOCALE_PARITY_BELOW_100',
        'ERROR',
        `Locale parity is ${parityPercent}%; 100% is required to publish.`,
        'locales',
      ),
    );
  if (mixedLanguageCandidates.length)
    errors.push(
      issue(
        'MIXED_LANGUAGE_CONTENT',
        'ERROR',
        `${mixedLanguageCandidates.length} translations equal the source language and may render mixed content.`,
        'locales',
      ),
    );
  if (declaredLanguages.length === 0)
    warnings.push(
      issue(
        'TRANSLATION_LANGUAGES_UNDECLARED',
        'WARNING',
        'Manifest does not declare supported languages.',
        'theme.json.languages',
      ),
    );
  else {
    const undeclaredRequired = requiredLanguages.filter(
      (language) => !declaredLanguages.includes(language),
    );
    if (undeclaredRequired.length)
      warnings.push(
        issue(
          'TRANSLATION_LANGUAGES_INCOMPLETE',
          'WARNING',
          `Manifest does not declare all platform languages: ${undeclaredRequired.join(', ')}.`,
          'theme.json.languages',
        ),
      );
  }
  if (extraKeys.length)
    warnings.push(
      issue(
        'EXTRA_TRANSLATION_KEY',
        'WARNING',
        `${extraKeys.length} locale keys are not present in en.json.`,
        'locales',
      ),
    );
  return { coverage, errors, warnings };
}
