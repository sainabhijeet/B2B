import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const TRANSLATION_QUEUE_NAME = 'theme_translation_queue';

@Injectable()
export class TranslationQueueService implements OnModuleDestroy {
  private readonly queue: Queue;
  constructor(private readonly config: ConfigService) {
    this.queue = new Queue(TRANSLATION_QUEUE_NAME, {
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
    });
  }

  async enqueue(jobId: string): Promise<void> {
    if (this.config.get<boolean>('translationPipeline.queueEnabled') !== true)
      return;
    await this.queue.add(
      'translation-job',
      { jobId },
      {
        jobId: `translation:${jobId}`,
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
