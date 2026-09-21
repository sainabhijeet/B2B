import type { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import { ThemeMigrationHealthService } from './theme-migration-health.service';

describe('ThemeMigrationHealthService', () => {
  it('reports canonical schema readiness without consulting runtime theme paths', async () => {
    const config = {
      get: jest.fn((_key: string, fallback: unknown) => fallback),
    } as unknown as ConfigService;
    const dataSource = {
      isInitialized: true,
      query: jest
        .fn()
        .mockResolvedValue([
          { table_name: 'theme_families' },
          { table_name: 'theme_releases' },
          { table_name: 'theme_bundles' },
          { table_name: 'theme_deployments' },
          { table_name: 'theme_legacy_mappings' },
          { table_name: 'theme_backfill_runs' },
        ]),
    } as unknown as DataSource;
    const countRepository = () => ({
      count: jest.fn().mockResolvedValue(1),
      findLatest: jest.fn().mockResolvedValue({
        runKey: 'run-1',
        status: 'COMPLETED',
        dryRun: false,
        countersJson: { releasesReady: 1 },
        startedAt: new Date(),
        finishedAt: new Date(),
      }),
    });

    const service = new ThemeMigrationHealthService(
      config,
      dataSource,
      countRepository() as never,
      countRepository() as never,
      countRepository() as never,
      countRepository() as never,
      countRepository() as never,
      countRepository() as never,
    );

    const result = await service.getHealth();

    expect(result.data).toEqual(
      expect.objectContaining({
        phase: 'phase-1',
        status: 'ready',
        runtimeIsolation: {
          legacyRuntimeAuthoritative: true,
          canonicalRuntimeReadEnabled: false,
          legacyWritesUnchanged: true,
          apiContractUnchanged: true,
          reservedRuntimeFlagsRequested: false,
        },
      }),
    );
    expect(dataSource.query).toHaveBeenCalledTimes(1);
  });
});
