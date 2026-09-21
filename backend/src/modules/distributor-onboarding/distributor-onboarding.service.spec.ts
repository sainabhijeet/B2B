import { normalizePlatformLanguageCode } from './distributor-onboarding.service';

describe('normalizePlatformLanguageCode', () => {
  it('preserves active platform language codes beyond the built-in seed list', () => {
    expect(normalizePlatformLanguageCode('zh')).toBe('zh');
    expect(normalizePlatformLanguageCode('pt-BR')).toBe('pt-br');
  });

  it('sanitizes invalid values and falls back to English when empty', () => {
    expect(normalizePlatformLanguageCode(' hi_123 ')).toBe('hi');
    expect(normalizePlatformLanguageCode('123')).toBe('en');
    expect(normalizePlatformLanguageCode(null)).toBe('en');
  });
});
