import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import { TRANSLATION_QUEUE_NAME } from './translation-queue.service';
import { TranslationPipelineService } from './translation-pipeline.service';

@Injectable()
export class TranslationWorkerService implements OnModuleInit, OnModuleDestroy {
  private worker: Worker | null = null;
  constructor(
    private readonly config: ConfigService,
    private readonly pipeline: TranslationPipelineService,
  ) {}

  onModuleInit(): void {
    if (
      this.config.get<boolean>('translationPipeline.enabled') !== true ||
      this.config.get<boolean>('translationPipeline.queueEnabled') !== true
    )
      return;
    this.worker = new Worker(
      TRANSLATION_QUEUE_NAME,
      async (job) => {
        if (
          job.name !== 'translation-job' ||
          typeof job.data?.jobId !== 'string'
        )
          return;
        await this.pipeline.process(job.data.jobId);
      },
      {
        connection: {
          host:
            this.config.get<string>('REDIS_HOST') ??
            process.env.REDIS_HOST ??
            '127.0.0.1',
          port: Number(
            this.config.get<string>('REDIS_PORT') ??
              process.env.REDIS_PORT ??
              6379,
          ),
        },
        concurrency: 2,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
  }
}
