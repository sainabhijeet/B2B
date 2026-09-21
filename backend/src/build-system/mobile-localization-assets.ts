import AdmZip = require('adm-zip');
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { Theme } from '../common/entities/theme.entity';

export type LocalizationAsset = {
  sourcePath: string;
  assetPath: string;
};

type Logger = (message: string) => Promise<void> | void;

const FLUTTER_LOCALIZATION_ROOT = 'assets/localization';
const FLUTTER_STOREFRONT_LOCALE_ROOT = 'assets/locales/storefront';

export async function prepareMobileLocalizationAssets(input: {
  mobileAppPath: string;
  repoRoot: string;
  selectedTheme?: Theme | null;
  languages?: string[];
  log?: Logger;
}): Promise<LocalizationAsset[]> {
  const log = input.log ?? (() => undefined);
  await log('[BUILD] Preparing copy-only localization assets...');

  const sources = await collectExpectedMobileLocalizationAssets(
    input.repoRoot,
    input.selectedTheme ?? null,
  );
  if (!sources.length) {
    throw new Error(
      'No original localization JSON files were found to package into the mobile artifact.',
    );
  }

  await assertRequiredLanguageFiles({
    repoRoot: input.repoRoot,
    selectedTheme: input.selectedTheme ?? null,
    languages: input.languages ?? [],
  });

  await fs.rm(join(input.mobileAppPath, FLUTTER_LOCALIZATION_ROOT), {
    recursive: true,
    force: true,
  });
  await fs.rm(join(input.mobileAppPath, FLUTTER_STOREFRONT_LOCALE_ROOT), {
    recursive: true,
    force: true,
  });

  await log(
    `[BUILD] Copying original language files: ${sources
      .map((file) => file.assetPath)
      .join(', ')}`,
  );
  for (const source of sources) {
    const targetPath = join(input.mobileAppPath, source.assetPath);
    await fs.mkdir(dirname(targetPath), { recursive: true });
    await fs.copyFile(source.sourcePath, targetPath);
  }

  await log('[BUILD] Copy-only localization assets prepared successfully.');
  return sources;
}

export async function collectExpectedMobileLocalizationAssets(
  repoRoot: string,
  selectedTheme?: Theme | null,
): Promise<LocalizationAsset[]> {
  return collectLocalizationSources(repoRoot, selectedTheme ?? null);
}

export async function validateMobileLocalizationAssetsInArtifact(input: {
  artifactPath: string;
  expectedAssets: LocalizationAsset[];
  log?: Logger;
}): Promise<void> {
  const log = input.log ?? (() => undefined);
  await log('[BUILD] Validating localization asset SHA-256 hashes...');

  const zip = new AdmZip(input.artifactPath);
  const entries = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => ({
      entry,
      name: normalizeZipPath(entry.entryName),
    }));

  const missing: LocalizationAsset[] = [];
  const mismatched: Array<{
    asset: LocalizationAsset;
    expectedHash: string;
    packagedHash: string;
  }> = [];

  for (const asset of input.expectedAssets) {
    const packagedEntry = findPackagedAsset(entries, asset.assetPath);
    if (!packagedEntry) {
      missing.push(asset);
      continue;
    }

    const sourceBytes = await fs.readFile(asset.sourcePath);
    const packagedBytes = packagedEntry.entry.getData();
    const expectedHash = sha256(sourceBytes);
    const packagedHash = sha256(packagedBytes);
    if (expectedHash !== packagedHash) {
      mismatched.push({ asset, expectedHash, packagedHash });
    }
  }

  if (missing.length) {
    throw new Error(
      `Localization validation FAILED. Missing original files in artifact: ${missing
        .map((asset) => asset.assetPath)
        .join(', ')}`,
    );
  }
  if (mismatched.length) {
    throw new Error(
      `Localization validation FAILED. Packaged files differ from their original source bytes: ${mismatched
        .map(
          ({ asset, expectedHash, packagedHash }) =>
            `${asset.assetPath} (source SHA-256 ${expectedHash}, packaged SHA-256 ${packagedHash})`,
        )
        .join('; ')}`,
    );
  }

  await log('[BUILD] Localization SHA-256 validation PASSED.');
}

async function collectLocalizationSources(
  repoRoot: string,
  selectedTheme: Theme | null,
): Promise<LocalizationAsset[]> {
  const normalizedRepoRoot = resolve(repoRoot);
  const sourceFiles = new Map<string, string>();

  const platformLanguages = await firstExistingFile([
    join(normalizedRepoRoot, 'storage', 'platform-languages.json'),
    join(normalizedRepoRoot, 'backend', 'storage', 'platform-languages.json'),
    join(process.cwd(), 'storage', 'platform-languages.json'),
  ]);
  if (platformLanguages) {
    sourceFiles.set(
      normalizeAssetPath(
        join(FLUTTER_LOCALIZATION_ROOT, 'platform-languages.json'),
      ),
      platformLanguages,
    );
  }

  const storefrontLocaleRoot = join(
    normalizedRepoRoot,
    'tenant-apps',
    'mobile-app',
    'assets',
    'locales',
    'storefront',
  );
  for (const file of await listJsonFiles(storefrontLocaleRoot)) {
    sourceFiles.set(
      normalizeAssetPath(
        join(
          FLUTTER_STOREFRONT_LOCALE_ROOT,
          relative(storefrontLocaleRoot, file),
        ),
      ),
      file,
    );
  }

  if (selectedTheme) {
    const [localeDir] = await selectedThemeLocaleDirectories(
      normalizedRepoRoot,
      selectedTheme,
    );
    if (localeDir) {
      for (const file of await listJsonFiles(localeDir)) {
        const assetPath = normalizeAssetPath(
          join(FLUTTER_LOCALIZATION_ROOT, basename(file)),
        );
        const existingSource = sourceFiles.get(assetPath);
        if (existingSource && resolve(existingSource) !== resolve(file)) {
          throw new Error(
            `Selected theme locale filename collision: ${assetPath} maps to both ${existingSource} and ${file}.`,
          );
        }
        sourceFiles.set(assetPath, file);
      }
    }
  }

  return [...sourceFiles.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([assetPath, sourcePath]) => ({ sourcePath, assetPath }));
}

async function assertRequiredLanguageFiles(input: {
  repoRoot: string;
  selectedTheme: Theme | null;
  languages: string[];
}): Promise<void> {
  const repoRoot = resolve(input.repoRoot);
  const languages = uniqueLanguageCodes(input.languages);
  const requiredLanguages = languages.length ? languages : ['en'];
  const missing: string[] = [];
  const storefrontLocaleRoot = join(
    repoRoot,
    'tenant-apps',
    'mobile-app',
    'assets',
    'locales',
    'storefront',
  );

  for (const language of requiredLanguages) {
    const path = join(storefrontLocaleRoot, `${language}.json`);
    if (!(await isFile(path))) {
      missing.push(
        `${normalizeAssetPath(relative(repoRoot, path))} (base mobile locale)`,
      );
    }
  }

  if (input.selectedTheme) {
    const themeLocaleDirs = await selectedThemeLocaleDirectories(
      repoRoot,
      input.selectedTheme,
    );
    for (const language of requiredLanguages) {
      const candidates = themeLocaleDirs.map((dir) =>
        join(dir, `${language}.json`),
      );
      const found = await firstExistingFile(candidates);
      if (!found) {
        const themeName =
          input.selectedTheme.slug ||
          input.selectedTheme.id ||
          'selected theme';
        missing.push(
          `${themeName}/locales/${language}.json (selected mobile theme locale)`,
        );
      }
    }
  }

  if (missing.length) {
    throw new Error(
      `Required original language files are missing. Copy-only localization cannot continue: ${missing.join(
        ', ',
      )}`,
    );
  }
}

async function selectedThemeLocaleDirectories(
  repoRoot: string,
  theme: Theme,
): Promise<string[]> {
  const candidates: string[] = [];
  if (theme.storagePath) {
    candidates.push(resolveStoragePath(repoRoot, theme.storagePath, 'locales'));
  }
  if (theme.slug) {
    const channel = theme.themeChannel === 'MOBILE' ? 'mobile' : 'web';
    candidates.push(
      join(repoRoot, 'storage', 'themes', channel, theme.slug, 'locales'),
    );
    candidates.push(
      join(
        repoRoot,
        'backend',
        'storage',
        'themes',
        channel,
        theme.slug,
        'locales',
      ),
    );
  }
  const existing: string[] = [];
  for (const candidate of uniquePaths(candidates)) {
    if (await isDirectory(candidate)) existing.push(candidate);
  }
  return existing;
}

function resolveStoragePath(
  repoRoot: string,
  storagePath: string,
  child: string,
): string {
  const normalized = storagePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.startsWith('storage/')) {
    return join(repoRoot, normalized, child);
  }
  if (normalized.startsWith('backend/storage/')) {
    return join(repoRoot, normalized, child);
  }
  return join(repoRoot, 'backend', normalized, child);
}

async function listJsonFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(path)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      files.push(path);
    }
  }
  return files;
}

function findPackagedAsset(
  entries: Array<{ entry: AdmZip.IZipEntry; name: string }>,
  assetPath: string,
): { entry: AdmZip.IZipEntry; name: string } | undefined {
  const normalizedAssetPath = normalizeZipPath(assetPath);
  return entries.find(
    ({ name }) =>
      name === normalizedAssetPath ||
      name === `assets/flutter_assets/${normalizedAssetPath}` ||
      name === `base/assets/flutter_assets/${normalizedAssetPath}` ||
      name.endsWith(`/flutter_assets/${normalizedAssetPath}`),
  );
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function uniqueLanguageCodes(languages: string[]): string[] {
  return [
    ...new Set(
      languages
        .map(
          (language) =>
            language.trim().toLowerCase().replace('_', '-').split('-')[0],
        )
        .filter((language) => /^[a-z]{2,3}$/u.test(language)),
    ),
  ];
}

function normalizeAssetPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

function normalizeZipPath(path: string): string {
  return normalizeAssetPath(path);
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean).map((path) => resolve(path)))];
}

async function firstExistingFile(paths: string[]): Promise<string | null> {
  for (const path of uniquePaths(paths)) {
    if (await isFile(path)) return path;
  }
  return null;
}

async function isFile(path: string): Promise<boolean> {
  const stat = await fs.stat(path).catch(() => null);
  return !!stat?.isFile();
}

async function isDirectory(path: string): Promise<boolean> {
  const stat = await fs.stat(path).catch(() => null);
  return !!stat?.isDirectory();
}
