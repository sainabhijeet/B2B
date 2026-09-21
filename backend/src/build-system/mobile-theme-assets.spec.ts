import AdmZip = require('adm-zip');
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Theme } from '../common/entities/theme.entity';
import {
  prepareMobileThemeAssets,
  validateMobileThemeAssetsInArtifact,
} from './mobile-theme-assets';

describe('mobile selected-theme assets', () => {
  let root: string;
  let mobileAppPath: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'mobile-theme-'));
    mobileAppPath = join(root, 'workspace', 'mobile-template');
    await fs.mkdir(mobileAppPath, { recursive: true });
    await fs.writeFile(
      join(mobileAppPath, 'pubspec.yaml'),
      [
        'name: fixture',
        'flutter:',
        '  assets:',
        '    - assets/theme/',
        '    # BEGIN GENERATED SELECTED THEME ASSETS',
        '    # END GENERATED SELECTED THEME ASSETS',
        '',
      ].join('\n'),
      'utf8',
    );
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('packages the selected template, tokens, locale and original assets', async () => {
    const themeRoot = join(
      root,
      'backend',
      'storage',
      'themes',
      'mobile',
      'grocery',
    );
    await writeJson(join(themeRoot, 'theme.json'), {
      mobile: {
        base_layout: 'grid',
        card_style: 'rounded',
        spacing: 'comfortable',
        show_banner: true,
        enable_quick_qty: true,
      },
      templates: { home: 'templates/home.json' },
      tokens: {
        colors: 'tokens/colors.json',
        layout: 'tokens/layout.json',
      },
      locales: { en: 'locales/en.json' },
    });
    await writeJson(join(themeRoot, 'templates', 'home.json'), {
      sections: [
        {
          id: 'hero-1',
          type: 'hero_banners',
          settings: { image: 'assets/banners/hero.png' },
        },
      ],
    });
    await writeJson(join(themeRoot, 'tokens', 'colors.json'), {
      light: { primary: '#138A43', background: '#F7FBF8' },
    });
    await writeJson(join(themeRoot, 'tokens', 'layout.json'), {
      base_layout: 'grid',
    });
    await writeJson(join(themeRoot, 'locales', 'en.json'), {
      home: { title: 'Wholesale Grocery Deals' },
    });
    const hero = Buffer.from('real-theme-image');
    const heroPath = join(themeRoot, 'assets', 'banners', 'hero.png');
    await fs.mkdir(dirname(heroPath), { recursive: true });
    await fs.writeFile(heroPath, hero);

    const assets = await prepareMobileThemeAssets({
      mobileAppPath,
      repoRoot: root,
      selectedTheme: mobileTheme(),
      language: 'en',
    });

    const bundle = JSON.parse(
      await fs.readFile(
        join(mobileAppPath, 'assets', 'theme', 'storefront_theme.json'),
        'utf8',
      ),
    ) as Record<string, any>;
    expect(bundle.theme_id).toBe('theme-id');
    expect(bundle.theme_name).toBe('Grocery New');
    expect(bundle.branding.primary_color).toBe('#138A43');
    expect(bundle.preview.assetBaseUrl).toBe('assets/theme/selected');
    expect(bundle.preview.homeTemplate.sections).toHaveLength(1);
    expect(bundle.preview.locale['home.title']).toBe('Wholesale Grocery Deals');
    await expect(
      fs.readFile(
        join(
          mobileAppPath,
          'assets',
          'theme',
          'selected',
          'assets',
          'banners',
          'hero.png',
        ),
      ),
    ).resolves.toEqual(hero);
    await expect(
      fs.readFile(join(mobileAppPath, 'pubspec.yaml'), 'utf8'),
    ).resolves.toContain('    - assets/theme/selected/assets/banners/hero.png');

    const artifactPath = join(root, 'selected-theme.apk');
    const artifact = new AdmZip();
    for (const asset of assets) {
      artifact.addFile(
        `assets/flutter_assets/${asset.assetPath}`,
        await fs.readFile(join(mobileAppPath, asset.assetPath)),
      );
    }
    artifact.writeZip(artifactPath);
    await expect(
      validateMobileThemeAssetsInArtifact({
        artifactPath,
        expectedAssets: assets,
      }),
    ).resolves.toBeUndefined();
  });

  it('fails when a packaged selected-theme asset is missing', async () => {
    const artifactPath = join(root, 'missing-theme.apk');
    new AdmZip().writeZip(artifactPath);

    await expect(
      validateMobileThemeAssetsInArtifact({
        artifactPath,
        expectedAssets: [
          {
            assetPath: 'assets/theme/storefront_theme.json',
            expectedHash: createHash('sha256').update('{}\n').digest('hex'),
          },
        ],
      }),
    ).rejects.toThrow(/missing/);
  });
});

function mobileTheme(): Theme {
  return {
    id: 'theme-id',
    slug: 'grocery',
    themeName: 'Grocery New',
    themeChannel: 'MOBILE',
    storagePath: 'themes/mobile/grocery',
  } as Theme;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
