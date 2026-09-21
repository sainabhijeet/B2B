import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export type LocaleCode =
  | 'en'
  | 'hi'
  | 'ar'
  | 'zh'
  | 'gu'
  | 'ur'
  | 'fr'
  | 'de'
  | 'es'
  | 'ru'
  | 'ja';

export type JsonObject = Record<string, unknown>;

export type FlattenedEntry = {
  key: string;
  path: string[];
  value: string;
};

export type LocaleFileScan = {
  file: string;
  locale: LocaleCode;
  encoding: 'UTF-8' | 'INVALID_UTF8';
  utf8WithoutBom: boolean;
  hasBom: boolean;
  jsonError: string | null;
  entries: FlattenedEntry[];
};

export type LocaleFinding = {
  file: string;
  locale: LocaleCode;
  key: string;
  value: string;
  reason: string;
};

export const SUPPORTED_LOCALES: LocaleCode[] = [
  'en',
  'hi',
  'ar',
  'zh',
  'gu',
  'ur',
  'fr',
  'de',
  'es',
  'ru',
  'ja',
];

export const TARGET_LOCALES: Exclude<LocaleCode, 'en'>[] = [
  'hi',
  'ar',
  'zh',
  'gu',
  'ur',
  'fr',
  'de',
  'es',
  'ru',
  'ja',
];

const SKIPPED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'gradle-home',
]);

const localeFilePattern =
  /[\\/]locales[\\/](en|hi|ar|zh|gu|ur|fr|de|es|ru|ja)\.json$/i;

export function projectRoot(): string {
  return path.resolve(__dirname, '../../..');
}

export async function pathExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory: string, output: string[]): Promise<void> {
  if (!(await pathExists(directory))) return;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file, output);
    else if (entry.isFile()) output.push(file);
  }
}

export async function discoverLocaleFiles(
  root = projectRoot(),
): Promise<string[]> {
  const candidates: string[] = [];
  for (const child of ['storage', 'backend', 'tenant-apps', 'admin', 'shared'])
    await walk(path.join(root, child), candidates);
  return candidates
    .filter((file) => localeFilePattern.test(file))
    .sort((a, b) => a.localeCompare(b));
}

export function localeFromFile(file: string): LocaleCode {
  const match = path
    .basename(file)
    .match(/^(en|hi|ar|zh|gu|ur|fr|de|es|ru|ja)\.json$/i);
  if (!match) throw new Error(`Unsupported locale file name: ${file}`);
  return match[1].toLowerCase() as LocaleCode;
}

export function isUtf8(buffer: Buffer): boolean {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

export function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function flattenLocale(
  value: unknown,
  keyPrefix = '',
  pathPrefix: string[] = [],
  output: FlattenedEntry[] = [],
): FlattenedEntry[] {
  if (typeof value === 'string') {
    output.push({ key: keyPrefix, path: pathPrefix, value });
    return output;
  }
  if (!isObject(value)) return output;
  for (const [key, child] of Object.entries(value))
    flattenLocale(
      child,
      keyPrefix ? `${keyPrefix}.${key}` : key,
      [...pathPrefix, key],
      output,
    );
  return output;
}

export function getAtPath(root: JsonObject, pathParts: string[]): unknown {
  let cursor: unknown = root;
  for (const part of pathParts) {
    if (!isObject(cursor)) return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

export function setAtPath(
  root: JsonObject,
  pathParts: string[],
  value: string,
): void {
  let cursor: JsonObject = root;
  for (const part of pathParts.slice(0, -1)) {
    const next = cursor[part];
    if (!isObject(next)) {
      cursor[part] = {};
      cursor = cursor[part] as JsonObject;
    } else {
      cursor = next;
    }
  }
  cursor[pathParts[pathParts.length - 1]] = value;
}

export async function scanLocaleFile(file: string): Promise<LocaleFileScan> {
  const buffer = await fs.readFile(file);
  const hasBom =
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf;
  const validUtf8 = isUtf8(buffer);
  let jsonError: string | null = null;
  let entries: FlattenedEntry[] = [];
  if (validUtf8) {
    try {
      const parsed = JSON.parse(
        buffer.toString('utf8').replace(/^\uFEFF/, ''),
      ) as unknown;
      entries = flattenLocale(parsed);
    } catch (error: unknown) {
      jsonError = error instanceof Error ? error.message : String(error);
    }
  }
  return {
    file,
    locale: localeFromFile(file),
    encoding: validUtf8 ? 'UTF-8' : 'INVALID_UTF8',
    utf8WithoutBom: validUtf8 && !hasBom,
    hasBom,
    jsonError,
    entries,
  };
}

export function isQuestionMarkCorruption(value: string): boolean {
  if (/\?{3,}/.test(value)) return true;
  const visible = [...value].filter(
    (char) => !/[\s\p{P}\p{S}0-9{}%._:-]/u.test(char),
  );
  if (visible.length === 0) return false;
  const questionMarks = visible.filter((char) => char === '?').length;
  return questionMarks / visible.length >= 0.6 && questionMarks >= 2;
}

export function unresolvedTranslationMarker(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.includes('�')) return 'UNICODE_REPLACEMENT_CHARACTER';
  if (trimmed.includes('⟦') || trimmed.includes('⟧'))
    return 'DEBUG_TRANSLATION_MARKER';
  if (/\[[a-z][\w-]*(?:\.[\w-]+)+\]/i.test(trimmed))
    return 'BRACKETED_TRANSLATION_KEY';
  if (/^[a-z][\w-]*(?:\.[\w-]+)+$/i.test(trimmed))
    return 'UNRESOLVED_TRANSLATION_KEY';
  return null;
}

export function localeFindings(scan: LocaleFileScan): LocaleFinding[] {
  const findings: LocaleFinding[] = [];
  if (scan.encoding !== 'UTF-8')
    findings.push({
      file: scan.file,
      locale: scan.locale,
      key: '<file>',
      value: '',
      reason: 'INVALID_UTF8',
    });
  if (scan.hasBom)
    findings.push({
      file: scan.file,
      locale: scan.locale,
      key: '<file>',
      value: '',
      reason: 'UTF8_BOM',
    });
  if (scan.jsonError)
    findings.push({
      file: scan.file,
      locale: scan.locale,
      key: '<file>',
      value: scan.jsonError,
      reason: 'INVALID_JSON',
    });
  for (const entry of scan.entries) {
    if (isQuestionMarkCorruption(entry.value))
      findings.push({
        file: scan.file,
        locale: scan.locale,
        key: entry.key,
        value: entry.value,
        reason: 'QUESTION_MARK_CORRUPTION',
      });
    const marker = unresolvedTranslationMarker(entry.value);
    if (marker)
      findings.push({
        file: scan.file,
        locale: scan.locale,
        key: entry.key,
        value: entry.value,
        reason: marker,
      });
  }
  return findings;
}

export function placeholders(value: string): string[] {
  return [
    ...[...value.matchAll(/%[sdif]/g)].map((match) => match[0]),
    ...[...value.matchAll(/\{\{\s*[\w.-]+\s*\}\}/g)].map((match) => match[0]),
    ...[...value.matchAll(/\{[A-Za-z_][\w.-]*\}/g)].map((match) => match[0]),
    ...[
      ...value.matchAll(
        /\{[A-Za-z_][\w.-]*\s*,\s*(?:plural|select|selectordinal)/g,
      ),
    ].map((match) => match[0]),
    ...[...value.matchAll(/:[A-Za-z_][\w.-]*/g)].map((match) => match[0]),
  ].sort();
}

export function protectedTokens(value: string): string[] {
  return [
    ...[...value.matchAll(/https?:\/\/[^\s<>()]+/gi)].map((match) => match[0]),
    ...[...value.matchAll(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g)].map(
      (match) => match[0],
    ),
    ...[...value.matchAll(/\b[A-Z]{2,}[A-Z0-9_-]*\d[A-Z0-9_-]*\b/g)].map(
      (match) => match[0],
    ),
  ].sort();
}

export function htmlTags(value: string): string[] {
  return [...value.matchAll(/<\/?[A-Za-z][^>]*>/g)]
    .map((match) => match[0])
    .sort();
}

export function markdownShape(value: string): {
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

export function balancedBraces(value: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

export function validateTranslationShape(
  source: string,
  translation: string,
): string[] {
  const errors: string[] = [];
  if (!translation.trim()) errors.push('EMPTY_TRANSLATION');
  if (isQuestionMarkCorruption(translation))
    errors.push('QUESTION_MARK_CORRUPTION');
  const marker = unresolvedTranslationMarker(translation);
  if (marker) errors.push(marker);
  if (
    JSON.stringify(placeholders(source)) !==
    JSON.stringify(placeholders(translation))
  )
    errors.push('PLACEHOLDER_MISMATCH');
  if (
    JSON.stringify(protectedTokens(source)) !==
    JSON.stringify(protectedTokens(translation))
  )
    errors.push('PROTECTED_TOKEN_MISMATCH');
  if (
    JSON.stringify(htmlTags(source)) !== JSON.stringify(htmlTags(translation))
  )
    errors.push('HTML_MISMATCH');
  if (
    JSON.stringify(markdownShape(source)) !==
    JSON.stringify(markdownShape(translation))
  )
    errors.push('MARKDOWN_OR_LINEBREAK_MISMATCH');
  if (!balancedBraces(translation)) errors.push('ICU_SYNTAX_MISMATCH');
  return errors;
}

export async function writeJsonAtomic(
  file: string,
  value: unknown,
): Promise<void> {
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temp, file);
}
