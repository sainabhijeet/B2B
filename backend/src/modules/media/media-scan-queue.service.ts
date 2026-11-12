import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppQueue,
  createAppQueue,
  createRequiredAppQueue,
} from '../../workers/queue-factory';
import { QUEUE_NAMES } from '../../workers/queues';
import {
  MEDIA_SCAN_JOB_NAME,
  mediaScanJobId,
} from './media-scan-queue.contract';

@Injectable()
export class MediaScanQueueService implements OnModuleDestroy {
  private readonly queue: AppQueue;
  constructor(private readonly config: ConfigService) {
    const required =
      config.get<boolean>('mediaMalware.enabled', true) &&
      config.get<boolean>('mediaMalware.failClosed', true);
    this.queue = required
      ? createRequiredAppQueue(QUEUE_NAMES.mediaScan, config)
      : createAppQueue(QUEUE_NAMES.mediaScan, config);
  }
  async enqueue(storageObjectId: string): Promise<void> {
    const attempts =
      this.config.get<number>('mediaMalware.maxAttempts', 3) ?? 3;
    const result = await this.queue.add(
      MEDIA_SCAN_JOB_NAME,
      { storageObjectId },
      {
        jobId: mediaScanJobId(storageObjectId),
        attempts,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );
    if ((result as { skipped?: boolean })?.skipped)
      throw new ServiceUnavailableException(
        'Media security scanning queue is unavailable.',
      );
  }
  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
