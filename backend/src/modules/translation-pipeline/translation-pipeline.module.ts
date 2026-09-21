import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theme } from '../../common/entities/theme.entity';
import { ThemeTranslationAuditEvent } from './entities/translation-audit-event.entity';
import { ThemeTranslationEntry } from './entities/translation-entry.entity';
import { ThemeTranslationJob } from './entities/translation-job.entity';
import { ThemeTranslationRevision } from './entities/translation-revision.entity';
import { TranslationPipelineController } from './translation-pipeline.controller';
import { TranslationPipelineService } from './translation-pipeline.service';
import { DraftTranslationProvider } from './translation-provider.service';
import { TRANSLATION_AI_PROVIDER } from './translation-provider.types';
import { TranslationQueueService } from './translation-queue.service';
import { TranslationWorkerService } from './translation-worker.service';
import { OpenAiTranslationProvider } from './openai-translation.provider';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Theme,
      ThemeTranslationJob,
      ThemeTranslationEntry,
      ThemeTranslationRevision,
      ThemeTranslationAuditEvent,
    ]),
  ],
  controllers: [TranslationPipelineController],
  providers: [
    TranslationPipelineService,
    TranslationQueueService,
    TranslationWorkerService,
    DraftTranslationProvider,
    OpenAiTranslationProvider,
    {
      provide: TRANSLATION_AI_PROVIDER,
      inject: [
        ConfigService,
        DraftTranslationProvider,
        OpenAiTranslationProvider,
      ],
      useFactory: (
        config: ConfigService,
        fallback: DraftTranslationProvider,
        openAi: OpenAiTranslationProvider,
      ) =>
        config.get<string>('TRANSLATION_AI_PROVIDER')?.trim().toLowerCase() ===
        'openai'
          ? openAi
          : fallback,
    },
  ],
  exports: [TranslationPipelineService],
})
export class TranslationPipelineModule {}
