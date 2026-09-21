import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  getThemeArtifactIsolation,
  readThemeMigrationFlags,
} from '../../common/observability/theme-migration-flags';
import { ThemeReleaseArtifactRepository } from './repositories/theme-release-artifact.repository';
import { ThemeArtifactMetricsService } from './storage/theme-artifact-metrics.service';
import {
  OBJECT_STORAGE_PORT,
  ObjectStoragePort,
} from './storage/object-storage.types';

@Injectable()
export class ThemeArtifactsHealthService {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly artifactRepository: ThemeReleaseArtifactRepository,
    @Inject(OBJECT_STORAGE_PORT)
    private readonly objectStorage: ObjectStoragePort,
    private readonly metrics: ThemeArtifactMetricsService,
  ) {}

  async getHealth(): Promise<Record<string, unknown>> {
    const flags = readThemeMigrationFlags(this.configService);
    const schemaPresent = await this.hasArtifactTable();
    const storage =
      flags.objectStorageEnabled && flags.artifactHealthChecksEnabled
        ? await this.objectStorage.healthCheck()
        : {
            configured: this.objectStorage.isConfigured(),
            reachable: false,
            provider: 's3-compatible' as const,
            bucket:
              this.configService.get<string>('r2.bucket', '').trim() || null,
            errorType: 'FeatureDisabled',
          };
    return {
      success: true,
      data: {
        phase: 'phase-2',
        status: !schemaPresent
          ? 'pending_migration'
          : storage.reachable
            ? 'ready'
            : 'disabled_or_unreachable',
        storage,
        artifactCount: schemaPresent
          ? await this.artifactRepository.count()
          : null,
        flags: {
          objectStorageEnabled: flags.objectStorageEnabled,
          dualPublishEnabled: flags.artifactDualPublishEnabled,
          importEnabled: flags.artifactImportEnabled,
          verificationEnabled: flags.artifactVerificationEnabled,
          healthChecksEnabled: flags.artifactHealthChecksEnabled,
        },
        isolation: getThemeArtifactIsolation(),
        metrics: this.metrics.snapshot(),
      },
      meta: {},
      message: '',
    };
  }

  getMetrics(): Record<string, unknown> {
    return {
      success: true,
      data: {
        phase: 'phase-2',
        isolation: getThemeArtifactIsolation(),
        metrics: this.metrics.snapshot(),
      },
      meta: {},
      message: '',
    };
  }

  private async hasArtifactTable(): Promise<boolean> {
    if (!this.dataSource.isInitialized) return false;
    const rows = (await this.dataSource.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'theme_release_artifacts'`,
    )) as unknown[];
    return rows.length > 0;
  }
}
