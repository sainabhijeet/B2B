import { LanguageConsistencyService } from './language-consistency.service';

describe('LanguageConsistencyService', () => {
  const service = new LanguageConsistencyService({
    get: jest.fn((_key: string, fallback: number) => fallback),
  } as never);

  it('normalizes and rejects unsupported active languages', () => {
    expect(service.resolve('ar-EG')).toBe('ar');
    expect(service.resolve('xx')).toBe('en');
  });

  it('invalidates cached language state immediately', () => {
    service.cacheLanguage('tenant-1', 'en');
    expect(service.readCachedLanguage('tenant-1')).toBe('en');
    expect(service.invalidate('tenant-1')).toBe(1);
    expect(service.readCachedLanguage('tenant-1')).toBeNull();
  });

  it('detects missing and mixed translation values', () => {
    const report = service.coverage(
      'ar',
      { greeting: 'Hello', cart: 'Cart' },
      {
        en: { greeting: 'Hello', cart: 'Cart' },
        ar: { greeting: 'مرحبا', cart: 'Cart' },
      },
    );
    expect(report.completeness).toBe(100);
    expect(report.mixedLanguageCandidates).toEqual([
      { language: 'ar', key: 'cart' },
    ]);
    expect(report.readyForPublish).toBe(false);
  });

  it('formats currency, numbers, and dates for the active locale', () => {
    expect(service.formatCurrency(1234.5, 'en', 'INR')).toContain('1,234.50');
    expect(service.formatNumber(1234.5, 'de')).toContain('1.234');
    expect(service.formatDate('2026-01-02T00:00:00Z', 'en')).toContain('Jan');
  });
});
