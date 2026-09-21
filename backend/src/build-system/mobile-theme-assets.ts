import AdmZip = require('adm-zip');
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { Theme } from '../common/entities/theme.entity';

export type MobileThemeAsset = {
  assetPath: string;
  expectedHash: string;
};

type Logger = (message: string) => Promise<void> | void;
type JsonObject = Record<string, unknown>;

const MOBILE_THEME_ASSET_ROOT = 'assets/theme';
const MOBILE_THEME_BUNDLE_PATH = `${MOBILE_THEME_ASSET_ROOT}/storefront_theme.json`;
const SELECTED_THEME_ASSET_BASE = `${MOBILE_THEME_ASSET_ROOT}/selected`;
const GENERATED_ASSETS_START = '    # BEGIN GENERATED SELECTED THEME ASSETS';
const GENERATED_ASSETS_END = '    # END GENERATED SELECTED THEME ASSETS';

export async function prepareMobileThemeAssets(input: {
  mobileAppPath: string;
  repoRoot: string;
  selectedTheme?: Theme | null;
  language?: string;
  log?: Logger;
}): Promise<MobileThemeAsset[]> {
  const log = input.log ?? (() => undefined);
  const destinationRoot = join(input.mobileAppPath, MOBILE_THEME_ASSET_ROOT);
  await fs.rm(destinationRoot, { recursive: true, force: true });
  await fs.mkdir(destinationRoot, { recursive: true });

  const theme = input.selectedTheme ?? null;
  if (!theme) {
    const fallback = Buffer.from(
      `${JSON.stringify(emptyThemeBundle(), null, 2)}\n`,
      'utf8',
    );
    await fs.writeFile(
      join(input.mobileAppPath, MOBILE_THEME_BUNDLE_PATH),
      fallback,
    );
    await updatePubspecThemeAssets(input.mobileAppPath, []);
    await log(
      '[BUILD] No mobile theme selected; packaged the default theme bundle.',
    );
    return [assetRecord(MOBILE_THEME_BUNDLE_PATH, fallback)];
  }
  if (theme.themeChannel !== 'MOBILE') {
    throw new Error(
      `Selected build theme ${theme.id} is not a MOBILE theme (${theme.themeChannel}).`,
    );
  }

  const sourceRoot = await resolveSelectedThemeRoot(input.repoRoot, theme);
  const manifest = await readJsonRequired(join(sourceRoot, 'theme.json'));
  const mobile = asObject(manifest['mobile']);
  const templates = asObject(manifest['templates']);
  const tokenReferences = asObject(manifest['tokens']);
  const language = normalizeLanguageCode(input.language);

  const homeTemplate = await readReferencedJson(
    sourceRoot,
    stringValue(templates['home']) || 'templates/home.json',
    true,
  );
  const colors = await readReferencedJson(
    sourceRoot,
    stringValue(tokenReferences['colors']),
    false,
  );
  const typography = await readReferencedJson(
    sourceRoot,
    stringValue(tokenReferences['typography']),
    false,
  );
  const layout = await readReferencedJson(
    sourceRoot,
    stringValue(tokenReferences['layout']),
    false,
  );
  const spacing = await readReferencedJson(
    sourceRoot,
    stringValue(tokenReferences['spacing']),
    false,
  );
  const locale = await readThemeLocale(sourceRoot, manifest, language);
  const lightColors = asObject(colors['light']);

  const bundle: JsonObject = {
    theme_id: theme.id,
    theme_slug: theme.slug,
    theme_name: theme.themeName,
    base_layout:
      stringValue(mobile['base_layout']) ||
      stringValue(layout['base_layout']) ||
      'grid',
    config: {
      card_style: mobile['card_style'] ?? 'rounded',
      spacing: mobile['spacing'] ?? 'compact',
      show_banner: mobile['show_banner'] ?? true,
      enable_quick_qty: mobile['enable_quick_qty'] ?? false,
    },
    branding: {
      primary_color: stringValue(lightColors['primary']) || '#1565C0',
      secondary_color:
        stringValue(lightColors['secondary']) ||
        stringValue(lightColors['primary']) ||
        '#1565C0',
      surface_color:
        stringValue(lightColors['background']) ||
        stringValue(lightColors['surface']) ||
        '#FFFFFF',
      text_color:
        stringValue(lightColors['on_surface']) ||
        stringValue(lightColors['on_background']) ||
        '#111827',
      logo: '',
    },
    preview: {
      themeName: theme.themeName,
      slug: theme.slug,
      assetBaseUrl: SELECTED_THEME_ASSET_BASE,
      homeTemplate,
      languageCode: language,
      locale: flattenLocale(locale),
      tokens: { colors, typography, layout, spacing },
    },
  };

  const expectedAssets: MobileThemeAsset[] = [];
  const bundleBytes = Buffer.from(
    `${JSON.stringify(bundle, null, 2)}\n`,
    'utf8',
  );
  await fs.writeFile(
    join(input.mobileAppPath, MOBILE_THEME_BUNDLE_PATH),
    bundleBytes,
  );
  expectedAssets.push(assetRecord(MOBILE_THEME_BUNDLE_PATH, bundleBytes));

  const sourceAssets = join(sourceRoot, 'assets');
  if (await isDirectory(sourceAssets)) {
    await copyThemeAssetTree({
      sourceRoot: sourceAssets,
      destinationRoot: join(
        input.mobileAppPath,
        SELECTED_THEME_ASSET_BASE,
        'assets',
      ),
      mobileAppPath: input.mobileAppPath,
      expectedAssets,
    });
  }
  await updatePubspecThemeAssets(
    input.mobileAppPath,
    expectedAssets
      .map((asset) => asset.assetPath)
      .filter((assetPath) =>
        assetPath.startsWith(`${SELECTED_THEME_ASSET_BASE}/`),
      ),
  );

  await log(
    `[BUILD] Packaged selected mobile theme ${theme.themeName} (${theme.id}) with ${expectedAssets.length} verified assets.`,
  );
  return expectedAssets;
}

export async function validateMobileThemeAssetsInArtifact(input: {
  artifactPath: string;
  expectedAssets: MobileThemeAsset[];
  log?: Logger;
}): Promise<void> {
  const log = input.log ?? (() => undefined);
  const zip = new AdmZip(input.artifactPath);
  const entries = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => ({
      entry,
      name: normalizeAssetPath(entry.entryName),
    }));
  const failures: string[] = [];

  for (const asset of input.expectedAssets) {
    const packaged = entries.find(
      ({ name }) =>
        name === asset.assetPath ||
        name === `assets/flutter_assets/${asset.assetPath}` ||
        name === `base/assets/flutter_assets/${asset.assetPath}` ||
        name.endsWith(`/flutter_assets/${asset.assetPath}`),
    );
    if (!packaged) {
      failures.push(`${asset.assetPath} (missing)`);
      continue;
    }
    const packagedHash = sha256(packaged.entry.getData());
    if (packagedHash !== asset.expectedHash) {
      failures.push(`${asset.assetPath} (SHA-256 mismatch)`);
    }
  }

  if (failures.length) {
    throw new Error(`Mobile theme validation FAILED: ${failures.join(', ')}.`);
  }
  await log(
    `[BUILD] Selected mobile theme bundle validation PASSED (${input.expectedAssets.length} assets).`,
  );
}

async function resolveSelectedThemeRoot(
  repoRoot: string,
  theme: Theme,
): Promise<string> {
  const root = resolve(repoRoot);
  const rawStoragePath = theme.storagePath ?? '';
  const storagePath = rawStoragePath
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
  const withoutBackend = storagePath.replace(/^backend\//, '');
  const withoutStorage = withoutBackend.replace(/^storage\//, '');
  const candidates = [
    ...(isAbsolute(rawStoragePath) ? [rawStoragePath] : []),
    storagePath ? join(root, storagePath) : '',
    withoutBackend ? join(root, 'backend', withoutBackend) : '',
    withoutStorage ? join(root, 'backend', 'storage', withoutStorage) : '',
    withoutStorage ? join(root, 'storage', withoutStorage) : '',
    theme.slug
      ? join(root, 'backend', 'storage', 'themes', 'mobile', theme.slug)
      : '',
    theme.slug ? join(root, 'storage', 'themes', 'mobile', theme.slug) : '',
  ];

  for (const candidate of uniquePaths(candidates)) {
    if (!isWithin(root, candidate)) continue;
    if (await isFile(join(candidate, 'theme.json'))) return candidate;
  }
  throw new Error(
    `Selected mobile theme files were not found for ${theme.slug || theme.id}.`,
  );
}

async function readReferencedJson(
  root: string,
  reference: string,
  required: boolean,
): Promise<JsonObject> {
  if (!reference) return {};
  const path = resolve(root, reference.replace(/\\/g, '/'));
  if (!isWithin(root, path)) {
    throw new Error(`Theme JSON reference escapes its package: ${reference}`);
  }
  if (!(await isFile(path))) {
    if (required)
      throw new Error(`Required theme JSON is missing: ${reference}`);
    return {};
  }
  return readJsonRequired(path);
}

async function readThemeLocale(
  root: string,
  manifest: JsonObject,
  language: string,
): Promise<JsonObject> {
  const locales = asObject(manifest['locales']);
  const references = [
    stringValue(locales[language]),
    stringValue(locales['en']),
    `locales/${language}.json`,
    'locales/en.json',
  ];
  for (const reference of [...new Set(references.filter(Boolean))]) {
    const locale = await readReferencedJson(root, reference, false);
    if (Object.keys(locale).length) return locale;
  }
  return {};
}

async function copyThemeAssetTree(input: {
  sourceRoot: string;
  destinationRoot: string;
  mobileAppPath: string;
  expectedAssets: MobileThemeAsset[];
}): Promise<void> {
  const entries = await fs.readdir(input.sourceRoot, { withFileTypes: true });
  for (const entry of entries) {
    const source = join(input.sourceRoot, entry.name);
    const destination = join(input.destinationRoot, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Theme assets cannot contain symbolic links: ${source}`);
    }
    if (entry.isDirectory()) {
      await copyThemeAssetTree({
        ...input,
        sourceRoot: source,
        destinationRoot: destination,
      });
      continue;
    }
    if (!entry.isFile()) continue;
    const bytes = await fs.readFile(source);
    await fs.mkdir(dirname(destination), { recursive: true });
    await fs.writeFile(destination, bytes);
    const assetPath = normalizeAssetPath(
      relative(input.mobileAppPath, destination),
    );
    input.expectedAssets.push(assetRecord(assetPath, bytes));
  }
}

async function updatePubspecThemeAssets(
  mobileAppPath: string,
  assetPaths: string[],
): Promise<void> {
  const pubspecPath = join(mobileAppPath, 'pubspec.yaml');
  const pubspec = await fs.readFile(pubspecPath, 'utf8');
  const start = pubspec.indexOf(GENERATED_ASSETS_START);
  const end = pubspec.indexOf(GENERATED_ASSETS_END);
  if (start < 0 || end < start) {
    throw new Error(
      'pubspec.yaml is missing the generated selected-theme asset markers.',
    );
  }
  const generated = [...new Set(assetPaths)]
    .sort((a, b) => a.localeCompare(b))
    .map((assetPath) => `    - ${normalizeAssetPath(assetPath)}`)
    .join('\n');
  const replacement = generated
    ? `${GENERATED_ASSETS_START}\n${generated}\n${GENERATED_ASSETS_END}`
    : `${GENERATED_ASSETS_START}\n${GENERATED_ASSETS_END}`;
  const updated =
    pubspec.slice(0, start) +
    replacement +
    pubspec.slice(end + GENERATED_ASSETS_END.length);
  await fs.writeFile(pubspecPath, updated, 'utf8');
}

function emptyThemeBundle(): JsonObject {
  return {
    theme_id: null,
    theme_slug: null,
    theme_name: null,
    base_layout: 'grid',
    config: {},
    branding: { primary_color: '#1565C0', logo: '' },
    preview: null,
  };
}

async function readJsonRequired(path: string): Promise<JsonObject> {
  const parsed: unknown = JSON.parse(await fs.readFile(path, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Theme JSON must contain an object: ${path}`);
  }
  return parsed as JsonObject;
}

function flattenLocale(value: unknown, prefix = ''): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output: Record<string, string> = {};
  for (const [key, child] of Object.entries(value as JsonObject)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') {
      output[nextKey] = child;
    } else {
      Object.assign(output, flattenLocale(child, nextKey));
    }
  }
  return output;
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLanguageCode(value?: string): string {
  const normalized = (value ?? 'en').trim().toLowerCase().replace('_', '-');
  const code = normalized.split('-')[0];
  return /^[a-z]{2,3}$/u.test(code) ? code : 'en';
}

function assetRecord(assetPath: string, bytes: Buffer): MobileThemeAsset {
  return {
    assetPath: normalizeAssetPath(assetPath),
    expectedHash: sha256(bytes),
  };
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeAssetPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+/, '');
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean).map((path) => resolve(path)))];
}

function isWithin(root: string, candidate: string): boolean {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

async function isFile(path: string): Promise<boolean> {
  return (await fs.stat(path).catch(() => null))?.isFile() === true;
}

async function isDirectory(path: string): Promise<boolean> {
  return (await fs.stat(path).catch(() => null))?.isDirectory() === true;
}
