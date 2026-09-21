import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  it('returns active platform language options through app-config', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue(null) };
    const appRepo = {};
    const profileRepo = { findOne: jest.fn().mockResolvedValue(null) };
    const industryRepo = {};
    const localization = {
      currentLanguage: jest.fn().mockResolvedValue('en'),
      languageContext: jest.fn().mockResolvedValue({
        tenantId: 'tenant-1',
        languageCode: 'en',
        locale: 'en-IN',
        direction: 'ltr',
        revision: 1,
      }),
      supportedLanguages: jest.fn().mockReturnValue(['en', 'hi', 'fr']),
      assertSupported: jest.fn((language: string) => language),
    };
    const onboarding = {
      listLanguages: jest.fn().mockResolvedValue([
        { code: 'en', name: 'English', status: 'active' },
        { code: 'hi', name: 'Hindi', status: 'active' },
        { code: 'fr', name: 'French', status: 'disabled' },
        { code: 'xx', name: 'Unsupported', status: 'active' },
      ]),
    };
    const service = new AppConfigService(
      repo as never,
      appRepo as never,
      profileRepo as never,
      industryRepo as never,
      localization as never,
      onboarding as never,
    );

    const result = await service.getForTenant('tenant-1');

    expect(result.languageContract.supportedLanguages).toEqual(['en', 'hi']);
    expect(result.languageContract.languageOptions).toEqual([
      { code: 'en', name: 'English' },
      { code: 'hi', name: 'Hindi' },
    ]);
  });
});
