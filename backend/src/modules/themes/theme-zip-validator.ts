import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { ThemeChannel } from '../../common/entities/theme.entity';
import type { ThemeManifestV1 } from './theme-manifest.util';
import { isKnownRegistrySectionType } from './theme-manifest.util';

export type ThemeZipValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

function direntName(name: string | Buffer): string {
  return typeof name === 'string' ? name : name.toString('utf8');
}

const FORBIDDEN_SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.mts', '.cts'];
const SUPPORTED_LOCALE_CODES = new Set([
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
]);

async function findForbiddenSourceFiles(rootAbs: string): Promise<string[]> {
  const hits: string[] = [];
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > 8) return;
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const nm = direntName(e.name);
      if (nm === 'node_modules' || nm === '.git') continue;
      const p = path.join(dir, nm);
      if (e.isDirectory()) {
        await walk(p, depth + 1);
      } else if (e.isFile()) {
        const lower = nm.toLowerCase();
        if (FORBIDDEN_SOURCE_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
          hits.push(path.relative(rootAbs, p).replace(/\\/g, '/'));
        }
      }
    }
  };
  await walk(rootAbs, 0);
  return hits;
}

function readCapabilitiesVariants(
  manifest: ThemeManifestV1,
): Record<string, string[]> | null {
  const cap = manifest.capabilities;
  if (!cap || typeof cap !== 'object' || Array.isArray(cap)) return null;
  const v = (cap as Record<string, unknown>).variants;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out: Record<string, string[]> = {};
  for (const [k, arr] of Object.entries(v as Record<string, unknown>)) {
    if (!Array.isArray(arr)) continue;
    const list = arr
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((x) => x.trim());
    if (list.length) out[k.trim().toLowerCase()] = list;
  }
  return Object.keys(out).length ? out : null;
}

async function validatePresetsDirectory(
  extractTo: string,
  manifest: ThemeManifestV1,
): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const presetDir = path.join(extractTo, 'presets');
  let st: Awaited<ReturnType<typeof fs.stat>>;
  try {
    st = await fs.stat(presetDir);
  } catch {
    return { errors, warnings };
  }
  if (!st.isDirectory()) {
    errors.push('presets exists but is not a directory.');
    return { errors, warnings };
  }
  const capVariants = readCapabilitiesVariants(manifest);
  const files = await fs.readdir(presetDir);
  for (const f of files) {
    if (!f.toLowerCase().endsWith('.json')) continue;
    const rel = path.posix.join('presets', f);
    const full = path.join(presetDir, f);
    let raw: string;
    try {
      raw = await fs.readFile(full, 'utf8');
    } catch {
      errors.push(`${rel}: file could not be read.`);
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      errors.push(`${rel}: invalid JSON.`);
      continue;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      errors.push(`${rel}: root must be a JSON object.`);
      continue;
    }
    const o = parsed as Record<string, unknown>;
    if (typeof o.section !== 'string' || !o.section.trim()) {
      errors.push(`${rel}: missing string "section".`);
      continue;
    }
    const sectionKey = o.section.trim().toLowerCase();
    if (!isKnownRegistrySectionType(sectionKey)) {
      warnings.push(
        `${rel}: section "${o.section}" is not in the platform registry catalog (allowed for custom experiments; storefront may stub).`,
      );
    }
    if (!Array.isArray(o.presets)) {
      errors.push(`${rel}: missing "presets" array.`);
      continue;
    }
    for (let i = 0; i < o.presets.length; i++) {
      const row = o.presets[i];
      const label = `${rel} presets[${i}]`;
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        errors.push(`${label}: must be an object.`);
        continue;
      }
      const p = row as Record<string, unknown>;
      if (typeof p.id !== 'string' || !p.id.trim())
        errors.push(`${label}: "id" is required.`);
      if (typeof p.label !== 'string' || !p.label.trim())
        errors.push(`${label}: "label" is required.`);
      if (p.variant !== undefined && typeof p.variant !== 'string') {
        errors.push(`${label}: "variant" must be a string when present.`);
      }
      if (
        p.settings !== undefined &&
        (typeof p.settings !== 'object' ||
          p.settings === null ||
          Array.isArray(p.settings))
      ) {
        errors.push(`${label}: "settings" must be a JSON object when present.`);
      }
      const v =
        typeof p.variant === 'string' ? p.variant.trim().toLowerCase() : '';
      if (v && capVariants) {
        const allowed = capVariants[sectionKey];
        if (
          allowed?.length &&
          !allowed.map((x) => x.toLowerCase()).includes(v)
        ) {
          warnings.push(
            `${label}: variant "${p.variant}" is not listed under theme.json capabilities.variants["${o.section}"].`,
          );
        }
      }
    }
  }
  return { errors, warnings };
}

async function validateOptionalSchemaJsonDir(
  extractTo: string,
  subdir: string,
  fileSuffix: string,
): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dir = path.join(extractTo, subdir);
  let st: Awaited<ReturnType<typeof fs.stat>>;
  try {
    st = await fs.stat(dir);
  } catch {
    return { errors, warnings };
  }
  if (!st.isDirectory()) return { errors, warnings };
  const files = await fs.readdir(dir);
  for (const f of files) {
    if (!f.toLowerCase().endsWith(fileSuffix)) continue;
    const rel = path.posix.join(subdir, f);
    const full = path.join(dir, f);
    let raw: string;
    try {
      raw = await fs.readFile(full, 'utf8');
    } catch {
      errors.push(`${rel}: unreadable.`);
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      errors.push(`${rel}: invalid JSON.`);
      continue;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      errors.push(`${rel}: root must be a JSON object.`);
      continue;
    }
    const name = (parsed as Record<string, unknown>).name;
    if (typeof name !== 'string' || !name.trim()) {
      errors.push(
        `${rel}: must include string "name" (block/section schema contract).`,
      );
    } else if (subdir === 'sections' && !isKnownRegistrySectionType(name)) {
      warnings.push(
        `${rel}: section schema name "${name}" is not in the platform registry (storefront may still render via stub).`,
      );
    }
  }
  return { errors, warnings };
}

function validateManifestCapabilityKeys(manifest: ThemeManifestV1): string[] {
  const warnings: string[] = [];
  const v = readCapabilitiesVariants(manifest);
  if (!v) return warnings;
  for (const key of Object.keys(v)) {
    if (!isKnownRegistrySectionType(key)) {
      warnings.push(
        `theme.json capabilities.variants key "${key}" is not in the platform section registry — verify spelling or extend backend catalog.`,
      );
    }
  }
  const cap = manifest.capabilities;
  if (cap && typeof cap === 'object' && !Array.isArray(cap)) {
    const blocks =
      (cap as Record<string, unknown>).allowedBlocks ??
      (cap as Record<string, unknown>).allowed_blocks;
    if (Array.isArray(blocks)) {
      for (const b of blocks) {
        if (
          typeof b === 'string' &&
          b.trim() &&
          !/^[a-z0-9-]+$/u.test(b.trim())
        ) {
          warnings.push(
            `theme.json capabilities allowed block "${b}" has unusual characters.`,
          );
        }
      }
    }
  }
  return warnings;
}

function flattenLocale(
  value: unknown,
  prefix = '',
  target: Record<string, string> = {},
): Record<string, string> {
  if (typeof value === 'string') {
    target[prefix] = value;
    return target;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenLocale(child, prefix ? `${prefix}.${key}` : key, target);
    }
  }
  return target;
}

function isNamespaceLeak(value: string): boolean {
  const trimmed = value.trim();
  return (
    /^⟦[^⟧]+⟧$/u.test(trimmed) ||
    /^\[[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+\]$/u.test(trimmed) ||
    /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+$/u.test(trimmed)
  );
}

function declaredLocalePaths(manifest: ThemeManifestV1): Map<string, string> {
  const out = new Map<string, string>();
  const locales = manifest.locales;
  if (locales && typeof locales === 'object' && !Array.isArray(locales)) {
    for (const [code, rel] of Object.entries(locales)) {
      if (typeof rel !== 'string' || !rel.trim()) continue;
      out.set(code.toLowerCase().split('-')[0], rel.trim());
    }
  }
  const languages = manifest.languages;
  if (Array.isArray(languages)) {
    for (const item of languages) {
      if (typeof item !== 'string' || !item.trim()) continue;
      const code = item.toLowerCase().split('-')[0];
      out.set(code, out.get(code) ?? `locales/${code}.json`);
    }
  }
  return out;
}

async function discoverLocalePaths(
  extractTo: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const dir = path.join(extractTo, 'locales');
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return out;
  }
  for (const file of entries) {
    if (!file.toLowerCase().endsWith('.json')) continue;
    const code = path.basename(file, '.json').toLowerCase().split('-')[0];
    out.set(code, path.posix.join('locales', file));
  }
  return out;
}

async function readLocaleJson(
  extractTo: string,
  relPath: string,
  language: string,
): Promise<{
  dictionary: Record<string, string> | null;
  error: string | null;
}> {
  if (!relPath.trim() || relPath.includes('..')) {
    return {
      dictionary: null,
      error: `Locale ${language} path is invalid: ${relPath}`,
    };
  }
  const fullPath = path.resolve(extractTo, relPath);
  const base = path.resolve(extractTo);
  if (!fullPath.startsWith(base + path.sep) && fullPath !== base) {
    return {
      dictionary: null,
      error: `Locale ${language} path escapes theme directory: ${relPath}`,
    };
  }
  let raw: string;
  try {
    raw = await fs.readFile(fullPath, 'utf8');
  } catch {
    return {
      dictionary: null,
      error: `Missing locale file for ${language}: ${relPath}`,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return {
      dictionary: null,
      error: `Locale file must be valid JSON for ${language}: ${relPath}`,
    };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      dictionary: null,
      error: `Locale file root must be a JSON object for ${language}: ${relPath}`,
    };
  }
  return { dictionary: flattenLocale(parsed), error: null };
}

async function validateLocaleParity(
  extractTo: string,
  manifest: ThemeManifestV1,
): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const paths = declaredLocalePaths(manifest);
  const discovered = await discoverLocalePaths(extractTo);
  for (const [language, rel] of discovered) {
    if (!paths.has(language)) paths.set(language, rel);
  }
  if (!paths.size) {
    warnings.push(
      'Theme package does not include locales/*.json; localization coverage cannot be verified at upload.',
    );
    return { errors, warnings };
  }
  if (!paths.has('en')) {
    errors.push(
      'Theme locales must include English source file: locales/en.json.',
    );
    return { errors, warnings };
  }
  for (const language of paths.keys()) {
    if (!SUPPORTED_LOCALE_CODES.has(language)) {
      warnings.push(
        `Locale "${language}" is not in the current platform supported language list.`,
      );
    }
  }
  const loaded = new Map<string, Record<string, string>>();
  for (const [language, rel] of paths) {
    const result = await readLocaleJson(extractTo, rel, language);
    if (result.error) {
      errors.push(result.error);
      continue;
    }
    loaded.set(language, result.dictionary ?? {});
  }
  const base = loaded.get('en');
  if (!base) return { errors, warnings };
  const baseKeys = Object.keys(base).sort();
  for (const [language, dictionary] of loaded) {
    const keys = Object.keys(dictionary).sort();
    const missing = baseKeys.filter((key) => !dictionary[key]?.trim());
    const extra = keys.filter((key) => !base[key]);
    if (missing.length) {
      errors.push(
        `Locale ${language} is missing ${missing.length} keys: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' ...' : ''}`,
      );
    }
    if (extra.length) {
      warnings.push(
        `Locale ${language} has ${extra.length} keys not present in en.json: ${extra.slice(0, 20).join(', ')}${extra.length > 20 ? ' ...' : ''}`,
      );
    }
    const namespaceLeaks = Object.entries(dictionary)
      .filter(([, value]) => isNamespaceLeak(value))
      .map(([key]) => key);
    if (namespaceLeaks.length) {
      errors.push(
        `Locale ${language} contains ${namespaceLeaks.length} unresolved namespace/marker values: ${namespaceLeaks.slice(0, 20).join(', ')}${namespaceLeaks.length > 20 ? ' ...' : ''}`,
      );
    }
  }
  return { errors, warnings };
}

/**
 * Extra ZIP checks beyond `readAndValidateThemeManifest` + `validateThemeTemplateFiles`.
 * Collects all issues first (errors block upload; warnings are advisory).
 */
export async function validateThemeZipPackage(
  extractTo: string,
  manifest: ThemeManifestV1,
  opts: { channel: ThemeChannel },
): Promise<ThemeZipValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const forbidden = await findForbiddenSourceFiles(extractTo);
  if (forbidden.length) {
    errors.push(
      `Theme ZIP must not ship executable source files. Remove: ${forbidden.slice(0, 12).join(', ')}${forbidden.length > 12 ? ' …' : ''}`,
    );
  }

  warnings.push(...validateManifestCapabilityKeys(manifest));

  const [pRes, secRes, blkRes, localeRes] = await Promise.all([
    validatePresetsDirectory(extractTo, manifest),
    validateOptionalSchemaJsonDir(extractTo, 'sections', '.schema.json'),
    validateOptionalSchemaJsonDir(extractTo, 'blocks', '.schema.json'),
    validateLocaleParity(extractTo, manifest),
  ]);
  errors.push(
    ...pRes.errors,
    ...secRes.errors,
    ...blkRes.errors,
    ...localeRes.errors,
  );
  warnings.push(
    ...pRes.warnings,
    ...secRes.warnings,
    ...blkRes.warnings,
    ...localeRes.warnings,
  );

  if (opts.channel === 'MOBILE' && !manifest.templates) {
    warnings.push(
      'Mobile theme: theme.json has no "templates" — ensure app shell packaging matches your mobile renderer expectations.',
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}
