import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { createReadStream } from 'node:fs';
import { DataSource } from 'typeorm';
import {
  getThemeArtifactIsolation,
  readThemeMigrationFlags,
} from '../../common/observability/theme-migration-flags';
import { writeThemeMigrationLog } from '../../common/observability/theme-migration-log';
import { ThemeRelease } from '../theme-migration/entities/theme-release.entity';
import { ThemeReleaseArtifact } from './entities/theme-release-artifact.entity';
import { ThemeArtifactMetricsService } from './storage/theme-artifact-metrics.service';
import {
  OBJECT_STORAGE_PORT,
  ObjectStoragePort,
} from './storage/object-storage.types';
import {
  findLegacyThemeArchive,
  sha256File,
  sha256Stream,
} from './theme-artifact-file.util';

type PublishInput = {
  legacyThemeId: string;
  storagePath: string | null;
  themeReleaseId: string | null;
  mode: 'dual-publish' | 'import';
};

@Injectable()
export class ThemeArtifactPublisherService {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(OBJECT_STORAGE_PORT)
    private readonly objectStorage: ObjectStoragePort,
    private readonly metrics: ThemeArtifactMetricsService,
  ) {}

  async publishLegacyTheme(input: {
    legacyThemeId: string;
    storagePath: string | null;
  }): Promise<ThemeReleaseArtifact | null> {
    const flags = readThemeMigrationFlags(this.configService);
    if (!flags.objectStorageEnabled || !flags.artifactDualPublishEnabled) {
      this.metrics.record('artifact.dual-publish', 'skipped');
      return null;
    }
    return this.publish({
      ...input,
      themeReleaseId: null,
      mode: 'dual-publish',
    });
  }

  async importReleaseArtifact(input: {
    legacyThemeId: string;
    themeReleaseId: string;
    storagePath: string | null;
  }): Promise<ThemeReleaseArtifact | null> {
    const flags = readThemeMigrationFlags(this.configService);
    if (!flags.objectStorageEnabled || !flags.artifactImportEnabled) {
      this.metrics.record('artifact.import', 'skipped');
      return null;
    }
    return this.publish({ ...input, mode: 'import' });
  }

  isolation() {
    return getThemeArtifactIsolation();
  }

  isDualPublishEnabled(): boolean {
    const flags = readThemeMigrationFlags(this.configService);
    return flags.objectStorageEnabled && flags.artifactDualPublishEnabled;
  }

  private async publish(input: PublishInput): Promise<ThemeReleaseArtifact> {
    const startedAt = Date.now();
    writeThemeMigrationLog({
      event: `theme.artifact.${input.mode}.requested`,
      phase: 'phase-2',
      implementation: 'object-storage-artifact',
      themeId: input.legacyThemeId,
      themeReleaseId: input.themeReleaseId,
      mode: input.mode,
    });
    try {
      const archive = await findLegacyThemeArchive(input.storagePath);
      if (!archive) throw new Error('Legacy theme ZIP archive was not found.');
      const sha256 = await sha256File(archive.absolutePath);
      const objectKey = `theme-artifacts/releases/${input.legacyThemeId}/${sha256}.zip`;
      const existing = await this.dataSource
        .getRepository(ThemeReleaseArtifact)
        .findOne({
          where: { legacyThemeId: input.legacyThemeId, artifactType: 'ZIP' },
        });
      if (existing) {
        if (
          existing.sha256 !== sha256 ||
          existing.sizeBytes !== String(archive.sizeBytes) ||
          existing.objectKey !== objectKey
        ) {
          throw new Error(
            'Immutable artifact metadata conflict for legacy theme.',
          );
        }
        await this.verifyStoredObject(
          existing.objectKey,
          existing.sha256,
          Number(existing.sizeBytes),
        );
        this.metrics.record(
          `artifact.${input.mode}`,
          'skipped',
          Date.now() - startedAt,
        );
        return existing;
      }

      const stored = await this.objectStorage.putImmutable({
        key: objectKey,
        body: createReadStream(archive.absolutePath),
        contentLength: archive.sizeBytes,
        contentType: 'application/zip',
        sha256,
      });
      await this.verifyStoredObject(objectKey, sha256, archive.sizeBytes);

      const runner = this.dataSource.createQueryRunner();
      await runner.connect();
      try {
        await runner.startTransaction();
        const repository = runner.manager.getRepository(ThemeReleaseArtifact);
        const release = input.themeReleaseId
          ? await runner.manager.getRepository(ThemeRelease).findOne({
              where: { id: input.themeReleaseId },
            })
          : null;
        if (input.themeReleaseId && !release) {
          throw new Error(
            'Canonical theme release was not found for artifact.',
          );
        }
        const row = repository.create({
          themeReleaseId: release?.id ?? input.themeReleaseId,
          legacyThemeId: input.legacyThemeId,
          artifactType: 'ZIP',
          storageProvider: 'S3_COMPATIBLE',
          bucketName: this.configService.get<string>('r2.bucket', '').trim(),
          objectKey,
          sha256,
          sizeBytes: String(archive.sizeBytes),
          contentType: 'application/zip',
          etag: stored.etag,
          verifiedAt: new Date(),
          metadataJson: {
            source: input.mode,
            sourceArchiveKey: archive.objectSourceKey,
            isolation: getThemeArtifactIsolation(),
          },
        });
        try {
          await repository.insert({
            themeReleaseId: row.themeReleaseId,
            legacyThemeId: row.legacyThemeId,
            artifactType: row.artifactType,
            storageProvider: row.storageProvider,
            bucketName: row.bucketName,
            objectKey: row.objectKey,
            sha256: row.sha256,
            sizeBytes: row.sizeBytes,
            contentType: row.contentType,
            etag: row.etag,
            verifiedAt: row.verifiedAt,
            metadataJson: row.metadataJson as never,
          });
          await runner.commitTransaction();
        } catch (error) {
          if (runner.isTransactionActive) await runner.rollbackTransaction();
          if (!this.isUniqueViolation(error)) throw error;
          const concurrent = await this.dataSource
            .getRepository(ThemeReleaseArtifact)
            .findOne({
              where: {
                legacyThemeId: input.legacyThemeId,
                artifactType: 'ZIP',
              },
            });
          if (!concurrent || concurrent.sha256 !== sha256) {
            throw new Error('Concurrent immutable artifact conflict detected.');
          }
          this.metrics.record(
            `artifact.${input.mode}`,
            'skipped',
            Date.now() - startedAt,
          );
          return concurrent;
        }
        this.metrics.record(
          `artifact.${input.mode}`,
          'success',
          Date.now() - startedAt,
          archive.sizeBytes,
        );
        writeThemeMigrationLog({
          event: `theme.artifact.${input.mode}.completed`,
          phase: 'phase-2',
          implementation: 'object-storage-artifact',
          themeId: input.legacyThemeId,
          themeReleaseId: input.themeReleaseId,
          mode: input.mode,
          durationMs: Date.now() - startedAt,
          metadata: { sha256, sizeBytes: archive.sizeBytes },
        });
        return row;
      } catch (error) {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        throw error;
      } finally {
        await runner.release();
      }
    } catch (error) {
      this.metrics.record(
        `artifact.${input.mode}`,
        'failure',
        Date.now() - startedAt,
      );
      writeThemeMigrationLog({
        event: `theme.artifact.${input.mode}.failed`,
        phase: 'phase-2',
        implementation: 'object-storage-artifact',
        themeId: input.legacyThemeId,
        themeReleaseId: input.themeReleaseId,
        mode: input.mode,
        durationMs: Date.now() - startedAt,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      throw error;
    }
  }

  private async verifyStoredObject(
    key: string,
    expectedSha256: string,
    expectedSize: number,
  ): Promise<void> {
    const flags = readThemeMigrationFlags(this.configService);
    const head = await this.objectStorage.head(key);
    if (!head || head.contentLength !== expectedSize) {
      throw new Error(`Stored artifact size mismatch for key "${key}".`);
    }
    if (!flags.artifactVerificationEnabled) return;
    const actualSha256 = await sha256Stream(
      await this.objectStorage.getStream(key),
    );
    if (actualSha256 !== expectedSha256) {
      throw new Error(`Stored artifact SHA-256 mismatch for key "${key}".`);
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      (error as { driverError?: { code?: string } })?.driverError?.code ===
      '23505'
    );
  }
}
