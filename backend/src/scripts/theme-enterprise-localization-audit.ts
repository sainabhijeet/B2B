import 'dotenv/config';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

type Locale = 'en' | 'zh' | 'hi' | 'fr' | 'ar' | 'es' | 'de' | 'ru' | 'ja';
type Dictionary = Record<string, string>;
type Edit = { theme: string; locale: Locale; key: string; value: string };

const LOCALES: Locale[] = [
  'en',
  'zh',
  'hi',
  'fr',
  'ar',
  'es',
  'de',
  'ru',
  'ja',
];
const root = path.resolve(__dirname, '../../..');
const themesRoot = path.join(root, 'storage', 'themes', 'web');
const outputRoot = path.join(
  root,
  'storage',
  'themes',
  'migration-reports',
  'enterprise-reference',
);
const dashboardPath = path.join(
  outputRoot,
  'localization-approval-dashboard.json',
);
const editsArg = process.argv.find((arg) => arg.startsWith('--bulk-edit='));
const approveAll = process.argv.includes('--approve-all');

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function filesUnder(directory: string): Promise<string[]> {
  if (!(await exists(directory))) return [];
  const result: string[] = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await filesUnder(file)));
    else result.push(file);
  }
  return result;
}

async function themeRoots(): Promise<string[]> {
  const roots: string[] = [];
  for (const file of await filesUnder(themesRoot)) {
    if (
      path.basename(file) === 'theme.json' &&
      !file.startsWith(path.join(themesRoot, 'enterprise-reference'))
    )
      roots.push(path.dirname(file));
  }
  return roots.sort();
}

function flatten(
  value: unknown,
  prefix = '',
  out: Dictionary = {},
): Dictionary {
  if (typeof value === 'string') out[prefix] = value;
  else if (isObject(value))
    for (const [key, child] of Object.entries(value))
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
  return out;
}

function duplicateKeys(json: string): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const match of json.matchAll(/^\s*"((?:\\.|[^"\\])+)"\s*:/gm)) {
    const key = match[1].replace(/\\"/g, '"');
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return [...duplicates].sort();
}

function signature(value: string, pattern: RegExp): string[] {
  return [...value.matchAll(pattern)].map((match) => match[0]).sort();
}

function placeholders(value: string): string[] {
  return [
    ...signature(value, /%[sdif]/g),
    ...signature(value, /\{\{\s*[\w.-]+\s*\}\}/g),
    ...signature(value, /\{[A-Za-z_][\w.-]*\}/g),
    ...signature(
      value,
      /\{[A-Za-z_][\w.-]*\s*,\s*(?:plural|select|selectordinal)/g,
    ),
  ].sort();
}

function tags(value: string): string[] {
  return signature(value, /<\/?[A-Za-z][^>]*>/g);
}

function markdown(value: string): {
  links: number;
  backticks: number;
  emphasis: number;
  lineBreaks: number;
} {
  return {
    links: (value.match(/\[[^\]]*\]\([^)]*\)/g) ?? []).length,
    backticks: (value.match(/`/g) ?? []).length,
    emphasis: (value.match(/\*\*|__/g) ?? []).length,
    lineBreaks: (value.match(/\r?\n/g) ?? []).length,
  };
}

function balanced(value: string, open: string, close: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === open) depth += 1;
    if (char === close) depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function icuSignature(value: string): string[] {
  return signature(
    value,
    /\{[A-Za-z_][\w.-]*\s*,\s*(?:plural|select|selectordinal)/g,
  );
}

function empty(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

async function loadDictionary(file: string): Promise<{
  dictionary: Dictionary;
  jsonError: string | null;
  duplicates: string[];
}> {
  const source = await fs.readFile(file, 'utf8');
  const duplicates = duplicateKeys(source);
  try {
    return {
      dictionary: flatten(JSON.parse(source) as unknown),
      jsonError: null,
      duplicates,
    };
  } catch (error: unknown) {
    return {
      dictionary: {},
      jsonError: error instanceof Error ? error.message : String(error),
      duplicates,
    };
  }
}

function compare(source: Dictionary, target: Dictionary) {
  const missing: string[] = [];
  const reviewRequired: string[] = [];
  const emptyValues: string[] = [];
  const placeholderMismatches: Array<{
    key: string;
    source: string[];
    target: string[];
  }> = [];
  const icuMismatches: Array<{
    key: string;
    source: string[];
    target: string[];
  }> = [];
  const htmlMismatches: string[] = [];
  const markdownMismatches: string[] = [];
  const duplicateTranslations = new Map<string, string[]>();
  const values = new Map<string, string[]>();
  for (const key of Object.keys(source)) {
    const value = target[key];
    if (empty(value)) {
      missing.push(key);
      emptyValues.push(key);
      continue;
    }
    if (value === 'REVIEW_REQUIRED') {
      reviewRequired.push(key);
      continue;
    }
    if (!values.has(value)) values.set(value, []);
    values.get(value)?.push(key);
    const sourcePlaceholders = placeholders(source[key]);
    const targetPlaceholders = placeholders(value);
    if (
      JSON.stringify(sourcePlaceholders) !== JSON.stringify(targetPlaceholders)
    )
      placeholderMismatches.push({
        key,
        source: sourcePlaceholders,
        target: targetPlaceholders,
      });
    const sourceIcu = icuSignature(source[key]);
    const targetIcu = icuSignature(value);
    if (
      !balanced(value, '{', '}') ||
      JSON.stringify(sourceIcu) !== JSON.stringify(targetIcu)
    )
      icuMismatches.push({ key, source: sourceIcu, target: targetIcu });
    if (JSON.stringify(tags(source[key])) !== JSON.stringify(tags(value)))
      htmlMismatches.push(key);
    if (
      JSON.stringify(markdown(source[key])) !== JSON.stringify(markdown(value))
    )
      markdownMismatches.push(key);
  }
  for (const [value, keys] of values)
    if (keys.length > 1) duplicateTranslations.set(value, keys);
  const blockingFindings =
    missing.length +
    reviewRequired.length +
    placeholderMismatches.length +
    icuMismatches.length +
    htmlMismatches.length +
    markdownMismatches.length;
  return {
    coverage: {
      totalKeys: Object.keys(source).length,
      approvedKeys: Math.max(0, Object.keys(source).length - blockingFindings),
      percentage: Object.keys(source).length
        ? Math.round(
            ((Object.keys(source).length - blockingFindings) /
              Object.keys(source).length) *
              100,
          )
        : 100,
    },
    missing,
    emptyValues,
    reviewRequired,
    placeholderMismatches,
    icuMismatches,
    htmlMismatches,
    markdownMismatches,
    duplicateTranslations: Object.fromEntries(duplicateTranslations),
    warnings: {
      duplicateTranslationValues: duplicateTranslations.size,
    },
    extraKeys: Object.keys(target).filter((key) => source[key] === undefined),
  };
}

async function applyEdits(edits: Edit[]): Promise<number> {
  let count = 0;
  for (const edit of edits) {
    const themeRoot = path.join(themesRoot, edit.theme);
    const file = path.join(themeRoot, 'locales', `${edit.locale}.json`);
    if (!(await exists(file)))
      throw new Error(
        `Locale file not found: ${edit.theme}/${edit.locale}.json`,
      );
    const loaded = await loadDictionary(file);
    loaded.dictionary[edit.key] = edit.value;
    await fs.writeFile(
      file,
      `${JSON.stringify(loaded.dictionary, null, 2)}\n`,
      'utf8',
    );
    count += 1;
  }
  return count;
}

async function auditTheme(themeRoot: string): Promise<Record<string, unknown>> {
  const theme = path.basename(themeRoot);
  const localeResults: Record<string, unknown> = {};
  let source: Dictionary = {};
  for (const locale of LOCALES) {
    const file = path.join(themeRoot, 'locales', `${locale}.json`);
    if (!(await exists(file))) {
      localeResults[locale] = {
        jsonError: 'Missing locale file',
        missing: Object.keys(source),
      };
      continue;
    }
    const loaded = await loadDictionary(file);
    if (locale === 'en') source = loaded.dictionary;
    localeResults[locale] = {
      jsonError: loaded.jsonError,
      duplicateKeys: loaded.duplicates,
    };
  }
  for (const locale of LOCALES.slice(1)) {
    const file = path.join(themeRoot, 'locales', `${locale}.json`);
    if (!(await exists(file))) continue;
    const loaded = await loadDictionary(file);
    localeResults[locale] = {
      ...(localeResults[locale] as Record<string, unknown>),
      ...compare(source, loaded.dictionary),
      jsonError: loaded.jsonError,
      duplicateKeys: loaded.duplicates,
    };
  }
  const languages = Object.values(localeResults) as Array<
    Record<string, unknown>
  >;
  const errors = languages.reduce(
    (total, item) =>
      total +
      arrayLength(item.missing) +
      arrayLength(item.reviewRequired) +
      arrayLength(item.placeholderMismatches) +
      arrayLength(item.icuMismatches) +
      arrayLength(item.htmlMismatches) +
      arrayLength(item.markdownMismatches) +
      arrayLength(item.duplicateKeys) +
      (item.jsonError ? 1 : 0),
    0,
  );
  return {
    theme,
    path: themeRoot,
    sourceKeyCount: Object.keys(source).length,
    locales: localeResults,
    errors,
    readyForApproval: errors === 0,
  };
}

async function main(): Promise<void> {
  let edited = 0;
  if (editsArg) {
    const edits = JSON.parse(
      await fs.readFile(editsArg.slice('--bulk-edit='.length), 'utf8'),
    ) as unknown;
    if (!Array.isArray(edits))
      throw new Error('--bulk-edit must point to a JSON array.');
    edited = await applyEdits(edits as Edit[]);
  }
  const reports = [];
  for (const theme of await themeRoots()) reports.push(await auditTheme(theme));
  const approvals = reports.map((report) => ({
    theme: report.theme,
    approved: approveAll && report.readyForApproval,
    approvedAt:
      approveAll && report.readyForApproval ? new Date().toISOString() : null,
  }));
  const dashboard = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceOfTruth: 'locales/en.json',
    supportedLanguages: LOCALES,
    bulkOperations: {
      editedEntries: edited,
      approveAllRequested: approveAll,
      approvalIsBlockedByFindings: true,
    },
    summary: {
      themes: reports.length,
      themesReadyForApproval: reports.filter(
        (report) => report.readyForApproval,
      ).length,
      themesWithFindings: reports.filter((report) => !report.readyForApproval)
        .length,
      reviewRequiredEntries: reports.reduce(
        (total, report) =>
          total +
          Object.values(
            report.locales as Record<string, Record<string, unknown>>,
          ).reduce((n, locale) => n + arrayLength(locale.reviewRequired), 0),
        0,
      ),
    },
    approvals,
    themes: reports,
  };
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.writeFile(
    dashboardPath,
    `${JSON.stringify(dashboard, null, 2)}\n`,
    'utf8',
  );
  await fs.writeFile(
    path.join(outputRoot, 'enterprise-localization-report.json'),
    `${JSON.stringify(dashboard, null, 2)}\n`,
    'utf8',
  );
  process.stdout.write(
    `${JSON.stringify({ dashboard: dashboardPath, editedEntries: edited, themes: reports.length, readyForApproval: dashboard.summary.themesReadyForApproval }, null, 2)}\n`,
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
