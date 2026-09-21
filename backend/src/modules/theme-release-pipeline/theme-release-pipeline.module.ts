import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThemeReleaseCandidate } from './entities/theme-release-candidate.entity';
import { ThemeReleaseValidationHistory } from './entities/theme-release-validation-history.entity';
import { ThemeReleasePipelineController } from './theme-release-pipeline.controller';
import { ThemeReleasePipelineService } from './theme-release-pipeline.service';
import { ThemeQuarantineStorageService } from './quarantine/theme-quarantine-storage.service';
import { ThemeReleasePreviewService } from './preview/theme-release-preview.service';
import { ThemeReleaseCandidateRepository } from './repositories/theme-release-candidate.repository';
import { ThemeReleaseValidationHistoryRepository } from './repositories/theme-release-validation-history.repository';
import { ThemeReleaseLifecycleEvent } from './entities/theme-release-lifecycle-event.entity';
import { ThemeReleaseReviewer } from './entities/theme-release-reviewer.entity';
import { ThemeReleaseReviewComment } from './entities/theme-release-review-comment.entity';
import { ThemeReleaseApprovalHistory } from './entities/theme-release-approval-history.entity';
import { ThemeReleaseLifecycleController } from './theme-release-lifecycle.controller';
import { ThemeReleaseLifecycleService } from './theme-release-lifecycle.service';
import { ThemeReleaseLifecycleMetricsService } from './theme-release-lifecycle-metrics.service';
import { ThemeLocalizationHealthController } from './theme-localization-health.controller';
import { ThemeLocalizationHealthService } from './theme-localization-health.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ThemeReleaseCandidate,
      ThemeReleaseValidationHistory,
      ThemeReleaseLifecycleEvent,
      ThemeReleaseReviewer,
      ThemeReleaseReviewComment,
      ThemeReleaseApprovalHistory,
    ]),
  ],
  controllers: [
    ThemeReleasePipelineController,
    ThemeReleaseLifecycleController,
    ThemeLocalizationHealthController,
  ],
  providers: [
    ThemeReleasePipelineService,
    ThemeQuarantineStorageService,
    ThemeReleasePreviewService,
    ThemeReleaseCandidateRepository,
    ThemeReleaseValidationHistoryRepository,
    ThemeReleaseLifecycleService,
    ThemeReleaseLifecycleMetricsService,
    ThemeLocalizationHealthService,
  ],
  exports: [ThemeReleasePipelineService],
})
export class ThemeReleasePipelineModule {}
