import AdmZip = require('adm-zip');
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Theme } from '../common/entities/theme.entity';
import {
  LocalizationAsset,
  prepareMobileLocalizationAssets,
  validateMobileLocalizationAssetsInArtifact,
} from './mobile-localization-assets';

describe('mobile copy-only localization assets', () => {
  let root: string;
  let mobileAppPath: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'mobile-localization-'));
    mobileAppPath = join(root, 'workspace', 'mobile-template');
    await fs.mkdir(mobileAppPath, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('copies original JSON bytes and leaves pubspec.yaml untouched', async () => {
    const baseLocale = Buffer.from(
      '{\n  "common": {\n    "home": "Home"\n  }\n}\n',
      'utf8',
    );
    const themeLocale = Buffer.from(
      '{\n  "theme": { "headline": "Original headline" }\n}\n',
      'utf8',
    );
    const platformLanguages = Buffer.from(
      '[\n  { "code": "en", "status": "active" }\n]\n',
      'utf8',
    );
    const pubspec =
      'name: fixture\nflutter:\n  assets:\n    - assets/localization/\n    - assets/locales/storefront/\n';

    const baseSource = join(
      root,
      'tenant-apps',
      'mobile-app',
      'assets',
      'locales',
      'storefront',
      'en.json',
    );
    const themeSource = join(
      root,
      'backend',
      'storage',
      'themes',
      'mobile',
      'copy-theme',
      'locales',
      'en.json',
    );
    const platformSource = join(
      root,
      'backend',
      'storage',
      'platform-languages.json',
    );
    const pubspecPath = join(mobileAppPath, 'pubspec.yaml');
    await writeBytes(baseSource, baseLocale);
    await writeBytes(themeSource, themeLocale);
    await writeBytes(platformSource, platformLanguages);
    await writeBytes(pubspecPath, Buffer.from(pubspec, 'utf8'));

    const assets = await prepareMobileLocalizationAssets({
      mobileAppPath,
      repoRoot: root,
      selectedTheme: mobileTheme(),
      languages: ['en'],
    });

    await expect(
      fs.readFile(
        join(mobileAppPath, 'assets', 'locales', 'storefront', 'en.json'),
      ),
    ).resolves.toEqual(baseLocale);
    await expect(
      fs.readFile(join(mobileAppPath, 'assets', 'localization', 'en.json')),
    ).resolves.toEqual(themeLocale);
    await expect(fs.readFile(pubspecPath, 'utf8')).resolves.toBe(pubspec);
    expect(assets.map((asset) => asset.assetPath)).toEqual([
      'assets/locales/storefront/en.json',
      'assets/localization/en.json',
      'assets/localization/platform-languages.json',
    ]);
  });

  it('packages selected-theme locale bytes at the source-declared localization root', async () => {
    const sourcePath = join(root, 'source', 'hi.json');
    const artifactPath = join(root, 'theme-locale.apk');
    const original = Buffer.from(
      '{\n  "headline": "Original Hindi"\n}\n',
      'utf8',
    );
    await writeBytes(sourcePath, original);
    const expectedAssets: LocalizationAsset[] = [
      {
        sourcePath,
        assetPath: 'assets/localization/hi.json',
      },
    ];

    const artifact = new AdmZip();
    artifact.addFile(
      'assets/flutter_assets/assets/localization/hi.json',
      original,
    );
    artifact.writeZip(artifactPath);

    await expect(
      validateMobileLocalizationAssetsInArtifact({
        artifactPath,
        expectedAssets,
      }),
    ).resolves.toBeUndefined();
  });

  it('fails instead of generating a missing required language', async () => {
    const baseSource = join(
      root,
      'tenant-apps',
      'mobile-app',
      'assets',
      'locales',
      'storefront',
      'en.json',
    );
    const themeSource = join(
      root,
      'backend',
      'storage',
      'themes',
      'mobile',
      'copy-theme',
      'locales',
      'en.json',
    );
    await writeBytes(baseSource, Buffer.from('{"common":{}}\n', 'utf8'));
    await writeBytes(themeSource, Buffer.from('{"theme":{}}\n', 'utf8'));

    await expect(
      prepareMobileLocalizationAssets({
        mobileAppPath,
        repoRoot: root,
        selectedTheme: mobileTheme(),
        languages: ['hi'],
      }),
    ).rejects.toThrow(/Required original language files are missing/);
  });

  it('accepts matching packaged bytes and rejects a SHA-256 mismatch', async () => {
    const sourcePath = join(root, 'source', 'en.json');
    const artifactPath = join(root, 'matching.aab');
    const mismatchedArtifactPath = join(root, 'mismatched.apk');
    const original = Buffer.from('{\n  "common.home": "Home"\n}\n', 'utf8');
    await writeBytes(sourcePath, original);
    const expectedAssets: LocalizationAsset[] = [
      {
        sourcePath,
        assetPath: 'assets/locales/storefront/en.json',
      },
    ];

    const matching = new AdmZip();
    matching.addFile(
      'base/assets/flutter_assets/assets/locales/storefront/en.json',
      original,
    );
    matching.writeZip(artifactPath);

    await expect(
      validateMobileLocalizationAssetsInArtifact({
        artifactPath,
        expectedAssets,
      }),
    ).resolves.toBeUndefined();

    const mismatched = new AdmZip();
    mismatched.addFile(
      'assets/flutter_assets/assets/locales/storefront/en.json',
      Buffer.from('{"common.home":"Generated value"}\n', 'utf8'),
    );
    mismatched.writeZip(mismatchedArtifactPath);

    await expect(
      validateMobileLocalizationAssetsInArtifact({
        artifactPath: mismatchedArtifactPath,
        expectedAssets,
      }),
    ).rejects.toThrow(/Packaged files differ from their original source bytes/);
  });
});

function mobileTheme(): Theme {
  return {
    id: 'theme-id',
    slug: 'copy-theme',
    themeChannel: 'MOBILE',
    storagePath: 'backend/storage/themes/mobile/copy-theme',
  } as Theme;
}

async function writeBytes(path: string, value: Buffer): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, value);
}
