import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readThemeMigrationFlags } from '../../common/observability/theme-migration-flags';
import { writeThemeMigrationLog } from '../../common/observability/theme-migration-log';
import { ThemeReleaseArtifact } from './entities/theme-release-artifact.entity';
import { ThemeReleaseArtifactRepository } from './repositories/theme-release-artifact.repository';
import { ThemeArtifactMetricsService } from './storage/theme-artifact-metrics.service';
import {
  OBJECT_STORAGE_PORT,
  ObjectStoragePort,
} from './storage/object-storage.types';
import { sha256Stream } from './theme-artifact-file.util';

export type ThemeArtifactVerificationResult = {
  mode: 'verify' | 'skipped';
  artifactsSeen: number;
  verified: number;
  failed: number;
};

@Injectable()
export class ThemeArtifactVerificationService {
  constructor(
    private readonly configService: ConfigService,
    private readonly artifactRepository: ThemeReleaseArtifactRepository,
    @Inject(OBJECT_STORAGE_PORT)
    private readonly objectStorage: ObjectStoragePort,
    private readonly metrics: ThemeArtifactMetricsService,
  ) {}

  async verifyAll(): Promise<ThemeArtifactVerificationResult> {
    const flags = readThemeMigrationFlags(this.configService);
    const artifacts = await this.artifactRepository.findAll();
    if (!flags.objectStorageEnabled || !flags.artifactVerificationEnabled) {
      this.metrics.record('artifact.verify', 'skipped');
      return {
        mode: 'skipped',
        artifactsSeen: artifacts.length,
        verified: 0,
        failed: 0,
      };
    }
    const result: ThemeArtifactVerificationResult = {
      mode: 'verify',
      artifactsSeen: artifacts.length,
      verified: 0,
      failed: 0,
    };
    writeThemeMigrationLog({
      event: 'theme.artifact.verify.requested',
      phase: 'phase-2',
      implementation: 'object-storage-artifact',
      mode: 'verify',
      metadata: { artifactsSeen: artifacts.length },
    });
    for (const artifact of artifacts) {
      try {
        await this.verifyOne(artifact);
        result.verified += 1;
      } catch (error) {
        result.failed += 1;
        writeThemeMigrationLog({
          event: 'theme.artifact.verify.failed',
          phase: 'phase-2',
          implementation: 'object-storage-artifact',
          themeId: artifact.legacyThemeId,
          themeReleaseId: artifact.themeReleaseId,
          mode: 'verify',
          errorType: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }
    writeThemeMigrationLog({
      event: 'theme.artifact.verify.completed',
      phase: 'phase-2',
      implementation: 'object-storage-artifact',
      mode: 'verify',
      metadata: result,
    });
    return result;
  }

  private async verifyOne(artifact: ThemeReleaseArtifact): Promise<void> {
    const head = await this.objectStorage.head(artifact.objectKey);
    if (!head || head.contentLength !== Number(artifact.sizeBytes)) {
      throw new Error('Artifact size verification failed.');
    }
    const actualSha256 = await sha256Stream(
      await this.objectStorage.getStream(artifact.objectKey),
    );
    if (actualSha256 !== artifact.sha256) {
      throw new Error('Artifact SHA-256 verification failed.');
    }
    this.metrics.record(
      'artifact.verify',
      'success',
      0,
      Number(artifact.sizeBytes),
    );
  }
}
