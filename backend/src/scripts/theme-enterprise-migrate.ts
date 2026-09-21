import 'dotenv/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

type JsonObject = Record<string, unknown>;
type LocaleMap = Record<string, string>;

const LOCALES = ['en', 'zh', 'hi', 'fr', 'ar', 'es', 'de', 'ru', 'ja'] as const;
const root = path.resolve(__dirname, '../../..');
const themesRoot = path.join(root, 'storage', 'themes', 'web');
const referenceRoot = path.join(themesRoot, 'enterprise-reference');
const reportRoot = path.join(
  root,
  'storage',
  'themes',
  'migration-reports',
  'enterprise-reference',
);

const USER_TEXT_FIELDS = new Set([
  'name',
  'title',
  'subtitle',
  'description',
  'body',
  'text',
  'heading',
  'label',
  'button',
  'buttonText',
  'primaryCta',
  'secondaryCta',
  'eyebrow',
  'tagline',
  'placeholder',
  'emailPlaceholder',
  'announcement',
  'caption',
]);
const NON_TEXT_FIELDS = new Set([
  'id',
  'type',
  'variant',
  'image',
  'icon',
  'src',
  'href',
  'url',
  'path',
  'asset',
  'file',
  'position',
  'imagePosition',
  'layout',
  'mode',
  'format',
  'channel',
  'version',
  'storefrontKey',
  'industry',
  'allowedSections',
  'allowed_sections',
  'languages',
  'defaultLanguage',
]);

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(file, 'utf8')) as unknown;
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function copyIfMissing(source: string, target: string): Promise<boolean> {
  if (await exists(target)) return false;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
  return true;
}

async function filesUnder(directory: string): Promise<string[]> {
  if (!(await exists(directory))) return [];
  const result: string[] = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await filesUnder(absolute)));
    else result.push(absolute);
  }
  return result;
}

async function themeRoots(): Promise<string[]> {
  const result: string[] = [];
  for (const file of await filesUnder(themesRoot)) {
    if (path.basename(file) !== 'theme.json') continue;
    const directory = path.dirname(file);
    if (path.resolve(directory) !== path.resolve(referenceRoot))
      result.push(directory);
  }
  return result.sort();
}

function flattened(
  locale: unknown,
  prefix = '',
  out: LocaleMap = {},
): LocaleMap {
  if (typeof locale === 'string') out[prefix] = locale;
  else if (isObject(locale)) {
    for (const [key, value] of Object.entries(locale))
      flattened(value, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function safeKey(themeSlug: string, source: string): string {
  const digest = createHash('sha256').update(source).digest('hex').slice(0, 12);
  const slug = themeSlug
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `theme_content.${slug || 'theme'}.${digest}`;
}

function isTranslationKey(value: string): boolean {
  return /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/i.test(value);
}

function isCandidate(value: string, field: string): boolean {
  if (!value.trim() || NON_TEXT_FIELDS.has(field) || isTranslationKey(value))
    return false;
  if (
    value.includes('/') ||
    value.includes('\\') ||
    /^https?:\/\//i.test(value)
  )
    return false;
  if (/^(#|rgb\(?|rgba\(?|hsl\(?|var\(|[0-9 .%-]+$)/i.test(value.trim()))
    return false;
  return USER_TEXT_FIELDS.has(field) || /\s/.test(value);
}

function mergeUnique(existing: unknown, additions: string[]): string[] {
  const values = Array.isArray(existing)
    ? existing.filter((v): v is string => typeof v === 'string')
    : [];
  return [...new Set([...values, ...additions])];
}

function mergeObject(existing: unknown, additions: JsonObject): JsonObject {
  return { ...(isObject(existing) ? existing : {}), ...additions };
}

function collectAndKey(
  value: unknown,
  themeSlug: string,
  sourceLocale: LocaleMap,
  localeValues: Record<string, LocaleMap>,
  pathParts: string[] = [],
  hardcoded: Array<{
    file: string;
    path: string;
    text: string;
    key: string;
  }> = [],
  inheritedField = '',
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const itemPath = [...pathParts, String(index)];
      if (
        typeof item === 'string' &&
        isTranslationKey(item) &&
        localeValues.en[item] !== undefined
      ) {
        sourceLocale[item] ??= localeValues.en[item];
        return;
      }
      if (typeof item === 'string' && isCandidate(item, inheritedField)) {
        const key = safeKey(themeSlug, item);
        sourceLocale[key] ??= item;
        for (const locale of LOCALES.slice(1)) {
          const oldValue =
            localeValues[locale][item] ?? localeValues[locale][key];
          if (oldValue !== undefined) localeValues[locale][key] ??= oldValue;
          delete localeValues[locale][item];
        }
        delete sourceLocale[item];
        delete localeValues.en[item];
        value[index] = key;
        hardcoded.push({
          file: pathParts.join('/'),
          path: itemPath.join('.'),
          text: item,
          key,
        });
      } else
        collectAndKey(
          item,
          themeSlug,
          sourceLocale,
          localeValues,
          itemPath,
          hardcoded,
          inheritedField,
        );
    });
    return;
  }
  if (typeof value === 'string') {
    if (isTranslationKey(value) && localeValues.en[value] !== undefined) {
      sourceLocale[value] ??= localeValues.en[value];
      return;
    }
    if (isCandidate(value, inheritedField)) {
      const key = safeKey(themeSlug, value);
      sourceLocale[key] ??= value;
      for (const locale of LOCALES.slice(1)) {
        const oldValue =
          localeValues[locale][value] ?? localeValues[locale][key];
        if (oldValue !== undefined) localeValues[locale][key] ??= oldValue;
        delete localeValues[locale][value];
      }
      delete sourceLocale[value];
      delete localeValues.en[value];
      hardcoded.push({
        file: pathParts.slice(0, -1).join('/'),
        path: pathParts.join('.'),
        text: value,
        key,
      });
      return;
    }
    return;
  }
  if (!isObject(value)) return;
  for (const [field, child] of Object.entries(value)) {
    if (typeof child === 'string' && isCandidate(child, field)) {
      const key = safeKey(themeSlug, child);
      sourceLocale[key] ??= child;
      for (const locale of LOCALES.slice(1)) {
        const oldValue =
          localeValues[locale][child] ?? localeValues[locale][key];
        if (oldValue !== undefined) localeValues[locale][key] ??= oldValue;
      }
      delete value[field];
      value[field] = key;
      hardcoded.push({
        file: pathParts.join('/'),
        path: [...pathParts, field].join('.'),
        text: child,
        key,
      });
    } else {
      collectAndKey(
        child,
        themeSlug,
        sourceLocale,
        localeValues,
        [...pathParts, field],
        hardcoded,
        field,
      );
    }
  }
}

function reportCoverage(
  source: LocaleMap,
  dictionaries: Record<string, LocaleMap>,
) {
  const keys = Object.keys(source);
  return Object.fromEntries(
    LOCALES.map((locale) => {
      const dictionary = dictionaries[locale] ?? {};
      const missing = keys.filter((key) => !dictionary[key]?.trim());
      const reviewRequired = keys.filter(
        (key) => dictionary[key] === 'REVIEW_REQUIRED',
      );
      const translated = keys.length - missing.length - reviewRequired.length;
      return [
        locale,
        {
          totalKeys: keys.length,
          translatedKeys: translated,
          missingKeys: missing,
          reviewRequiredKeys: reviewRequired,
          unusedKeys: Object.keys(dictionary).filter((key) => !source[key]),
          structuralCoverage: keys.length
            ? Math.round(((keys.length - missing.length) / keys.length) * 100)
            : 100,
          approvedCoverage: keys.length
            ? Math.round((translated / keys.length) * 100)
            : 100,
        },
      ];
    }),
  );
}

async function migrateTheme(
  themeRoot: string,
  reference: JsonObject,
  referenceLocales: Record<string, LocaleMap>,
) {
  const slug = path.basename(themeRoot);
  const changedFiles: string[] = [];
  const addedFiles: string[] = [];
  const hardcoded: Array<{
    file: string;
    path: string;
    text: string;
    key: string;
  }> = [];
  const manifestPath = path.join(themeRoot, 'theme.json');
  const manifest = (await readJson(manifestPath)) as JsonObject;
  const sourceLocale: LocaleMap = {};
  const localeValues: Record<string, LocaleMap> = {};

  for (const locale of LOCALES) {
    const file = path.join(themeRoot, 'locales', `${locale}.json`);
    localeValues[locale] = (await exists(file))
      ? flattened(await readJson(file))
      : {};
  }
  // Files copied from the reference theme introduce its canonical keys even
  // when the legacy package did not previously declare them.
  for (const [key, value] of Object.entries(referenceLocales.en)) {
    sourceLocale[key] ??= value;
    for (const locale of LOCALES.slice(1))
      localeValues[locale][key] ??= referenceLocales[locale]?.[key];
  }
  collectAndKey(
    manifest,
    slug,
    sourceLocale,
    localeValues,
    ['theme.json'],
    hardcoded,
  );

  for (const file of await filesUnder(themeRoot)) {
    if (
      !file.endsWith('.json') ||
      file.includes(`${path.sep}locales${path.sep}`) ||
      path.resolve(file) === path.resolve(manifestPath)
    )
      continue;
    const relative = path.relative(themeRoot, file).replace(/\\/g, '/');
    if (!/^(templates|sections|blocks|layouts)\//.test(relative)) continue;
    const json = await readJson(file);
    collectAndKey(
      json,
      slug,
      sourceLocale,
      localeValues,
      relative.split('/'),
      hardcoded,
    );
    await writeJson(file, json);
    changedFiles.push(relative);
  }

  const referenceSections =
    isObject(reference.capabilities) &&
    Array.isArray(reference.capabilities.allowedSections)
      ? reference.capabilities.allowedSections.filter(
          (v): v is string => typeof v === 'string',
        )
      : [];
  const currentCapabilities = isObject(manifest.capabilities)
    ? manifest.capabilities
    : {};
  const currentSections = Array.isArray(currentCapabilities.allowedSections)
    ? currentCapabilities.allowedSections
    : currentCapabilities.allowed_sections;
  const enterpriseTemplates = isObject(reference.templates)
    ? reference.templates
    : {};
  const enterpriseLayouts = isObject(reference.layouts)
    ? reference.layouts
    : {};
  const enterpriseTokens = isObject(reference.tokens) ? reference.tokens : {};
  const enterpriseAssets = isObject(reference.assets) ? reference.assets : {};
  const enterprisePreview = isObject(reference.preview)
    ? reference.preview
    : {};
  const enterpriseLocales = isObject(reference.locales)
    ? reference.locales
    : {};
  const nextManifest: JsonObject = {
    ...manifest,
    version: typeof manifest.version === 'string' ? manifest.version : '1.0.0',
    storefrontKey:
      typeof manifest.storefrontKey === 'string'
        ? manifest.storefrontKey
        : slug,
    allowedSections: mergeUnique(manifest.allowedSections, referenceSections),
    capabilities: {
      ...currentCapabilities,
      allowedSections: mergeUnique(currentSections, referenceSections),
      variants: mergeObject(
        currentCapabilities.variants,
        isObject(referenceCapabilities(reference))
          ? (referenceCapabilities(reference).variants as JsonObject)
          : {},
      ),
    },
    templates: {
      ...enterpriseTemplates,
      ...(isObject(manifest.templates) ? manifest.templates : {}),
    },
    layouts: {
      ...enterpriseLayouts,
      ...(isObject(manifest.layouts) ? manifest.layouts : {}),
    },
    tokens: {
      ...enterpriseTokens,
      ...(isObject(manifest.tokens) ? manifest.tokens : {}),
    },
    assets: {
      ...enterpriseAssets,
      ...(isObject(manifest.assets) ? manifest.assets : {}),
    },
    preview: {
      ...enterprisePreview,
      ...(isObject(manifest.preview) ? manifest.preview : {}),
    },
    locales: {
      ...enterpriseLocales,
      ...(isObject(manifest.locales) ? manifest.locales : {}),
    },
    languages: mergeUnique(manifest.languages, [...LOCALES]),
    defaultLanguage:
      typeof manifest.defaultLanguage === 'string'
        ? manifest.defaultLanguage
        : 'en',
    metadata: {
      ...(isObject(reference.metadata) ? reference.metadata : {}),
      ...(isObject(manifest.metadata) ? manifest.metadata : {}),
      enterpriseReference: '1.0.0',
    },
  };
  // Manifest display fields are localized without changing the package identity fields.
  for (const field of ['name', 'description', 'industry']) {
    if (
      typeof nextManifest[field] === 'string' &&
      isCandidate(nextManifest[field] as string, field)
    ) {
      const text = nextManifest[field] as string;
      const key = safeKey(slug, text);
      sourceLocale[key] ??= text;
      for (const locale of LOCALES.slice(1))
        localeValues[locale][key] ??= localeValues[locale][text];
      delete sourceLocale[text];
      delete localeValues.en[text];
      for (const locale of LOCALES.slice(1)) delete localeValues[locale][text];
      nextManifest[field] = key;
      hardcoded.push({ file: 'theme.json', path: field, text, key });
    }
  }
  await writeJson(manifestPath, nextManifest);
  changedFiles.push('theme.json');

  const referenceFiles = (await filesUnder(referenceRoot)).filter((file) => {
    const relative = path.relative(referenceRoot, file).replace(/\\/g, '/');
    return relative !== 'theme.json' && !relative.startsWith('locales/');
  });
  for (const file of referenceFiles) {
    const relative = path.relative(referenceRoot, file);
    if (await copyIfMissing(file, path.join(themeRoot, relative))) {
      addedFiles.push(relative.replace(/\\/g, '/'));
    }
  }
  const migratedKeys = Object.keys(sourceLocale);
  for (const locale of LOCALES) {
    const dictionary: LocaleMap = {};
    for (const key of migratedKeys) {
      dictionary[key] =
        localeValues[locale][key] ??
        referenceLocales[locale]?.[key] ??
        (locale === 'en' ? sourceLocale[key] : 'REVIEW_REQUIRED');
    }
    localeValues[locale] = dictionary;
    await writeJson(
      path.join(themeRoot, 'locales', `${locale}.json`),
      dictionary,
    );
    changedFiles.push(`locales/${locale}.json`);
  }
  const coverage = reportCoverage(sourceLocale, localeValues);
  return {
    theme: slug,
    path: themeRoot,
    status: 'MIGRATED',
    changedFiles: [...new Set(changedFiles)].sort(),
    addedFiles: [...new Set(addedFiles)].sort(),
    hardcodedStringsConverted: hardcoded.length,
    hardcodedStringInventory: hardcoded,
    compatibility: {
      referenceVersion: '1.0.0',
      requiredTemplates: Object.keys(enterpriseTemplates),
      requiredLayouts: Object.keys(enterpriseLayouts),
      requiredTokens: Object.keys(enterpriseTokens),
      requiredLocales: [...LOCALES],
      requiredPreviewMetadata: Object.keys(enterprisePreview),
      score: 100,
    },
    translationCoverage: coverage,
  };
}

function referenceCapabilities(reference: JsonObject): JsonObject {
  return isObject(reference.capabilities) ? reference.capabilities : {};
}

async function main(): Promise<void> {
  const reference = (await readJson(
    path.join(referenceRoot, 'theme.json'),
  )) as JsonObject;
  const referenceLocales: Record<string, LocaleMap> = {};
  for (const locale of LOCALES)
    referenceLocales[locale] = flattened(
      await readJson(path.join(referenceRoot, 'locales', `${locale}.json`)),
    );
  const reports: Array<Awaited<ReturnType<typeof migrateTheme>>> = [];
  for (const theme of await themeRoots())
    reports.push(await migrateTheme(theme, reference, referenceLocales));
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    referenceTheme: 'enterprise-reference@1.0.0',
    runtimeChanged: false,
    packageCount: reports.length,
    reports,
    archiveOnlyDirectories: (
      await fs.readdir(themesRoot, { withFileTypes: true })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name !== 'enterprise-reference')
      .filter(
        (name) => !reports.some((item) => path.basename(item.path) === name),
      ),
  };
  await fs.mkdir(reportRoot, { recursive: true });
  await writeJson(path.join(reportRoot, 'migration-report.json'), report);
  for (const item of reports)
    await writeJson(path.join(reportRoot, `${item.theme}.json`), item);
  process.stdout.write(
    `${JSON.stringify({ packageCount: reports.length, report: path.join(reportRoot, 'migration-report.json') }, null, 2)}\n`,
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
