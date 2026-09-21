import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readThemeMigrationFlags } from '../../common/observability/theme-migration-flags';
import { writeThemeMigrationLog } from '../../common/observability/theme-migration-log';
import { Theme } from '../../common/entities/theme.entity';
import { ThemeRelease } from '../theme-migration/entities/theme-release.entity';
import { ThemeArtifactPublisherService } from './theme-artifact-publisher.service';
import { findLegacyThemeArchive, sha256File } from './theme-artifact-file.util';

export type ThemeArtifactImportResult = {
  mode: 'dry-run' | 'apply' | 'skipped';
  releasesSeen: number;
  artifactsReady: number;
  missingArchives: number;
  failed: number;
};

@Injectable()
export class ThemeArtifactImporterService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ThemeRelease)
    private readonly releaseRepository: Repository<ThemeRelease>,
    @InjectRepository(Theme)
    private readonly themeRepository: Repository<Theme>,
    private readonly publisher: ThemeArtifactPublisherService,
  ) {}

  async importAll(input: {
    apply: boolean;
    themeReleaseId?: string;
  }): Promise<ThemeArtifactImportResult> {
    const flags = readThemeMigrationFlags(this.configService);
    if (
      input.apply &&
      (!flags.objectStorageEnabled || !flags.artifactImportEnabled)
    ) {
      writeThemeMigrationLog({
        event: 'theme.artifact.import.skipped',
        phase: 'phase-2',
        implementation: 'object-storage-artifact',
        mode: 'apply',
        metadata: { reason: 'feature_flag_disabled' },
      });
      return {
        mode: 'skipped',
        releasesSeen: 0,
        artifactsReady: 0,
        missingArchives: 0,
        failed: 0,
      };
    }

    const releases = input.themeReleaseId
      ? await this.releaseRepository.find({
          where: { id: input.themeReleaseId },
        })
      : await this.releaseRepository.find({ order: { createdAt: 'ASC' } });
    const result: ThemeArtifactImportResult = {
      mode: input.apply ? 'apply' : 'dry-run',
      releasesSeen: releases.length,
      artifactsReady: 0,
      missingArchives: 0,
      failed: 0,
    };
    writeThemeMigrationLog({
      event: 'theme.artifact.import.requested',
      phase: 'phase-2',
      implementation: 'object-storage-artifact',
      mode: result.mode,
      metadata: { themeReleaseId: input.themeReleaseId ?? null },
    });
    for (const release of releases) {
      if (!release.legacyThemeId) {
        result.missingArchives += 1;
        continue;
      }
      const theme = await this.themeRepository.findOne({
        where: { id: release.legacyThemeId },
      });
      const archive = await findLegacyThemeArchive(theme?.storagePath);
      if (!theme || !archive) {
        result.missingArchives += 1;
        continue;
      }
      if (!input.apply) {
        await sha256File(archive.absolutePath);
        result.artifactsReady += 1;
        continue;
      }
      try {
        await this.publisher.importReleaseArtifact({
          legacyThemeId: release.legacyThemeId,
          themeReleaseId: release.id,
          storagePath: theme.storagePath,
        });
        result.artifactsReady += 1;
      } catch {
        result.failed += 1;
      }
    }
    writeThemeMigrationLog({
      event: 'theme.artifact.import.completed',
      phase: 'phase-2',
      implementation: 'object-storage-artifact',
      mode: result.mode,
      metadata: result,
    });
    return result;
  }
}
