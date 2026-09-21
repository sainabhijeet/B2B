import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theme } from '../../common/entities/theme.entity';
import { ThemeRelease } from '../theme-migration/entities/theme-release.entity';
import { ThemeReleaseArtifact } from './entities/theme-release-artifact.entity';
import { ThemeArtifactsHealthController } from './theme-artifacts-health.controller';
import { ThemeArtifactsHealthService } from './theme-artifacts-health.service';
import { ThemeArtifactImporterService } from './theme-artifact-importer.service';
import { ThemeArtifactPublisherService } from './theme-artifact-publisher.service';
import { ThemeArtifactVerificationService } from './theme-artifact-verification.service';
import { ThemeReleaseArtifactRepository } from './repositories/theme-release-artifact.repository';
import { ThemeArtifactMetricsService } from './storage/theme-artifact-metrics.service';
import { S3CompatibleObjectStorageService } from './storage/s3-compatible-object-storage.service';
import { OBJECT_STORAGE_PORT } from './storage/object-storage.types';

@Module({
  imports: [
    TypeOrmModule.forFeature([Theme, ThemeRelease, ThemeReleaseArtifact]),
  ],
  controllers: [ThemeArtifactsHealthController],
  providers: [
    ThemeArtifactMetricsService,
    S3CompatibleObjectStorageService,
    {
      provide: OBJECT_STORAGE_PORT,
      useExisting: S3CompatibleObjectStorageService,
    },
    ThemeReleaseArtifactRepository,
    ThemeArtifactPublisherService,
    ThemeArtifactImporterService,
    ThemeArtifactVerificationService,
    ThemeArtifactsHealthService,
  ],
  exports: [
    ThemeArtifactPublisherService,
    ThemeArtifactImporterService,
    ThemeArtifactVerificationService,
  ],
})
export class ThemeArtifactsModule {}
