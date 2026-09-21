import {
  compareRuntimeResources,
  hashRuntimeResponse,
} from './runtime-comparison.engine';

describe('runtime comparison engine', () => {
  it('detects added, removed, changed, and missing resources', () => {
    const base = {
      schemaVersion: 1 as const,
      requestId: 'request-1',
      tenantId: 'tenant-1',
      channel: 'WEB' as const,
      legacyResponseHash: hashRuntimeResponse({ legacy: true }),
      canonicalResponseHash: hashRuntimeResponse({ canonical: true }),
      legacyDurationMs: 2,
      canonicalDurationMs: 4,
      generatedAt: new Date().toISOString(),
    };
    const report = compareRuntimeResources(
      {
        theme: { name: 'old' },
        templates: { home: 'old' },
        sections: {},
        blocks: {},
        components: {},
        tokens: { primary: 'red' },
        assets: {},
        locales: {},
        runtimeConfiguration: {},
      },
      {
        theme: { name: 'new' },
        templates: { home: 'new', product: 'new' },
        sections: {},
        blocks: {},
        components: {},
        tokens: { primary: 'blue' },
        assets: { logo: 'logo.svg' },
        locales: {},
        runtimeConfiguration: {},
      },
      base,
    );
    expect(report.status).toBe('DIFFERENT');
    expect(
      report.changed.some(
        (item) => item.category === 'theme' && item.path === 'name',
      ),
    ).toBe(true);
    expect(
      report.added.some(
        (item) => item.category === 'templates' && item.path === 'product',
      ),
    ).toBe(true);
    expect(report.removed.some((item) => item.category === 'assets')).toBe(
      true,
    );
    expect(report.missing.some((item) => item.category === 'assets')).toBe(
      true,
    );
  });
});
