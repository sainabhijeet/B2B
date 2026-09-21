import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  getThemeRuntimeIsolation,
  readThemeMigrationFlags,
} from '../../common/observability/theme-migration-flags';
import { ThemeBackfillRunRepository } from './repositories/theme-backfill-run.repository';
import { ThemeBundleRepository } from './repositories/theme-bundle.repository';
import { ThemeDeploymentRepository } from './repositories/theme-deployment.repository';
import { ThemeFamilyRepository } from './repositories/theme-family.repository';
import { ThemeLegacyMappingRepository } from './repositories/theme-legacy-mapping.repository';
import { ThemeReleaseRepository } from './repositories/theme-release.repository';

const CANONICAL_TABLES = [
  'theme_families',
  'theme_releases',
  'theme_bundles',
  'theme_deployments',
  'theme_legacy_mappings',
  'theme_backfill_runs',
] as const;

type QueryRow = { table_name?: string };

@Injectable()
export class ThemeMigrationHealthService {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly familyRepository: ThemeFamilyRepository,
    private readonly releaseRepository: ThemeReleaseRepository,
    private readonly bundleRepository: ThemeBundleRepository,
    private readonly deploymentRepository: ThemeDeploymentRepository,
    private readonly mappingRepository: ThemeLegacyMappingRepository,
    private readonly backfillRunRepository: ThemeBackfillRunRepository,
  ) {}

  async getHealth(): Promise<Record<string, unknown>> {
    const flags = readThemeMigrationFlags(this.configService);
    const presentTables = await this.getPresentTables();
    const canonicalSchemaPresent = CANONICAL_TABLES.every((table) =>
      presentTables.includes(table),
    );
    const latestBackfillRun = canonicalSchemaPresent
      ? await this.backfillRunRepository.findLatest()
      : null;
    const status = !canonicalSchemaPresent
      ? 'pending_migration'
      : latestBackfillRun?.status === 'COMPLETED'
        ? 'ready'
        : 'pending_backfill';

    return {
      success: true,
      data: {
        phase: 'phase-1',
        status,
        database: {
          reachable: this.dataSource.isInitialized,
          canonicalSchemaPresent,
          presentTables,
        },
        canonicalCounts: canonicalSchemaPresent
          ? {
              themeFamilies: await this.familyRepository.count(),
              themeReleases: await this.releaseRepository.count(),
              themeBundles: await this.bundleRepository.count(),
              themeDeployments: await this.deploymentRepository.count(),
              legacyMappings: await this.mappingRepository.count(),
              backfillRuns: await this.backfillRunRepository.count(),
            }
          : null,
        latestBackfillRun: latestBackfillRun
          ? {
              runKey: latestBackfillRun.runKey,
              status: latestBackfillRun.status,
              dryRun: latestBackfillRun.dryRun,
              counters: latestBackfillRun.countersJson,
              startedAt: latestBackfillRun.startedAt,
              finishedAt: latestBackfillRun.finishedAt,
            }
          : null,
        migrationFlags: flags,
        runtimeIsolation: getThemeRuntimeIsolation(flags),
      },
      meta: {},
      message: '',
    };
  }

  private async getPresentTables(): Promise<string[]> {
    if (!this.dataSource.isInitialized) return [];
    const rows = (await this.dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ANY($1::text[])`,
      [CANONICAL_TABLES],
    )) as QueryRow[];
    return rows
      .map((row) => row.table_name)
      .filter((value): value is string => Boolean(value));
  }
}
