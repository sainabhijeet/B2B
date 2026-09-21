import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ENTERPRISE_SUPPORTED_LANGUAGES } from '../../../common/localization/localization.constants';
import {
  translationCoverageBlockers,
  validateTranslations,
} from './translation.validator';

async function writeLocale(root: string, language: string, value: unknown) {
  await fs.mkdir(path.join(root, 'locales'), { recursive: true });
  await fs.writeFile(
    path.join(root, 'locales', `${language}.json`),
    typeof value === 'string' ? value : JSON.stringify(value),
    'utf8',
  );
}

describe('validateTranslations', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'theme-i18n-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('requires locale parity across every enterprise language', async () => {
    await writeLocale(root, 'en', { home: { title: 'Home' } });
    await writeLocale(root, 'hi', { home: { title: 'होम' } });

    const result = await validateTranslations(root, {});

    expect(result.coverage.requiredLanguages).toEqual([
      ...ENTERPRISE_SUPPORTED_LANGUAGES,
    ]);
    expect(result.coverage.readyForPublish).toBe(false);
    expect(result.coverage.missingLocales).toContain('zh');
    expect(result.coverage.parityPercent).toBeLessThan(100);
    expect(translationCoverageBlockers(result.coverage)).toContain(
      'MISSING_LOCALE',
    );
  });

  it('rejects invalid locale JSON and unresolved namespace markers', async () => {
    await writeLocale(root, 'en', { home: { title: 'Home' } });
    for (const language of ENTERPRISE_SUPPORTED_LANGUAGES) {
      if (language === 'en' || language === 'ar') continue;
      await writeLocale(root, language, { home: { title: `${language} Home` } });
    }
    await writeLocale(root, 'ar', '{"home":');
    await writeLocale(root, 'zh', { home: { title: '⟦home.title⟧' } });

    const result = await validateTranslations(root, {});

    expect(result.coverage.readyForPublish).toBe(false);
    expect(result.coverage.invalidJson).toHaveLength(1);
    expect(result.coverage.brokenNamespaces).toHaveLength(1);
    expect(result.errors.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(['INVALID_LOCALE_JSON', 'BROKEN_NAMESPACE']),
    );
  });

  it('marks complete locale sets as publish-ready', async () => {
    await writeLocale(root, 'en', { home: { title: 'Home' } });
    for (const language of ENTERPRISE_SUPPORTED_LANGUAGES) {
      if (language === 'en') continue;
      await writeLocale(root, language, { home: { title: `${language} Home` } });
    }

    const result = await validateTranslations(root, {
      languages: [...ENTERPRISE_SUPPORTED_LANGUAGES],
    });

    expect(result.coverage.readyForPublish).toBe(true);
    expect(result.coverage.parityPercent).toBe(100);
    expect(translationCoverageBlockers(result.coverage)).toEqual([]);
  });
});
