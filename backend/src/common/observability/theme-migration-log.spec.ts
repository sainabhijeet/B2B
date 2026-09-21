import { createThemeMigrationLog } from './theme-migration-log';

describe('theme migration log schema', () => {
  it('normalizes every event to the same top-level fields', () => {
    const log = createThemeMigrationLog({
      event: 'theme.release.upload.completed',
      phase: 'phase-1',
      implementation: 'canonical-backfill',
      platform: 'web',
      themeId: 'theme-1',
      durationMs: 12,
      metadata: { runKey: 'run-1' },
      counters: { releasesReady: 1 },
    });

    expect(log).toEqual({
      schemaVersion: 1,
      timestamp: expect.any(String),
      component: 'theme-migration',
      phase: 'phase-1',
      implementation: 'canonical-backfill',
      event: 'theme.release.upload.completed',
      operation: 'theme.release.upload',
      outcome: 'completed',
      correlationId: null,
      requestId: null,
      requestMethod: null,
      requestPath: null,
      tenantId: null,
      themeId: 'theme-1',
      themeReleaseId: null,
      themeBundleId: null,
      deploymentId: null,
      legacyEntity: null,
      legacyId: null,
      channel: 'WEB',
      mode: null,
      actorRole: null,
      durationMs: 12,
      errorType: null,
      metadata: {
        runKey: 'run-1',
        counters: { releasesReady: 1 },
      },
    });
  });

  it('redacts sensitive metadata before serialization', () => {
    const log = createThemeMigrationLog({
      event: 'theme.backfill.completed',
      metadata: {
        accessToken: 'secret-value',
        counters: { releasesReady: 1 },
      },
    });

    expect(log.metadata).toEqual({
      accessToken: '[REDACTED]',
      counters: { releasesReady: 1 },
    });
  });
});
