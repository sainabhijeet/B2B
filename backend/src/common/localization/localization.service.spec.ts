import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { TenantAppSettings } from '../entities/tenant-app-settings.entity';
import { LocalizationService } from './localization.service';

describe('LocalizationService', () => {
  let repo: jest.Mocked<
    Pick<Repository<TenantAppSettings>, 'findOne' | 'upsert'>
  >;
  let tempDir: string;
  let service: LocalizationService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'localization-service-'));
    repo = {
      findOne: jest.fn(),
      upsert: jest.fn(),
    };
    service = new LocalizationService(
      repo as never,
      {
        get: jest.fn((key: string, fallback: unknown) => {
          if (key === 'localization.commonLocalesDir') return tempDir;
          return fallback;
        }),
      } as unknown as ConfigService,
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('loads current language only from tenant_app_settings', async () => {
    repo.findOne.mockResolvedValue({
      selectedLanguageCode: 'fr',
    } as TenantAppSettings);

    await expect(service.currentLanguage('tenant-1')).resolves.toBe('fr');
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      select: ['selectedLanguageCode'],
    });
  });

  it('defaults missing tenant settings to English for backward compatibility', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.currentLanguage('tenant-1')).resolves.toBe('en');
  });

  it('invalidates revision based language cache', async () => {
    repo.findOne.mockResolvedValue({
      selectedLanguageCode: 'hi',
    } as TenantAppSettings);

    await expect(service.currentLanguage('tenant-1')).resolves.toBe('hi');
    repo.findOne.mockResolvedValue({
      selectedLanguageCode: 'ar',
    } as TenantAppSettings);

    await expect(service.currentLanguage('tenant-1')).resolves.toBe('hi');
    service.invalidate('tenant:tenant-1');
    await expect(service.currentLanguage('tenant-1')).resolves.toBe('ar');
  });

  it('merges common and theme locales with selected theme values winning', async () => {
    await fs.writeFile(
      path.join(tempDir, 'en.json'),
      JSON.stringify({ home: { title: 'Home' }, cart: 'Cart' }),
    );
    await fs.writeFile(
      path.join(tempDir, 'fr.json'),
      JSON.stringify({ home: { title: 'Accueil' } }),
    );
    const themeRoot = path.join(tempDir, 'theme');
    await fs.mkdir(path.join(themeRoot, 'locales'), { recursive: true });
    await fs.writeFile(
      path.join(themeRoot, 'locales', 'en.json'),
      JSON.stringify({ 'hero.title': 'Hero', cart: 'Theme cart' }),
    );
    await fs.writeFile(
      path.join(themeRoot, 'locales', 'fr.json'),
      JSON.stringify({ 'hero.title': 'Hero FR' }),
    );

    const locale = await service.loadLocale({
      languageCode: 'fr',
      themeRoot,
      tenantId: 'tenant-1',
    });

    expect(locale.dictionary).toMatchObject({
      'home.title': 'Accueil',
      cart: 'Theme cart',
      'hero.title': 'Hero FR',
    });
    expect(service.t('hero.title', locale)).toBe('Hero FR');
    expect(
      service.missingTranslations(['hero.title', 'missing'], locale),
    ).toEqual(['missing']);
  });

  it('normalizes languages and formats locale-aware values', () => {
    expect(service.resolveLanguage('ar-EG')).toBe('ar');
    expect(service.direction('ur')).toBe('rtl');
    expect(service.formatNumber(1234.5, 'de')).toContain('1.234');
    expect(service.formatCurrency(1234.5, 'en', 'INR')).toContain('1,234.50');
  });
});
