import { Worker, type Job } from 'bullmq';
import { MediaMalwareScanService } from '../modules/media/media-malware-scan.service';
import {
  MEDIA_SCAN_JOB_NAME,
  validateMediaScanPayload,
} from '../modules/media/media-scan-queue.contract';
import { QUEUE_NAMES } from './queues';

export const MEDIA_SCAN_WORKER_NAME = 'media_scan_worker';
export function createMediaScanWorker(
  connection: { host: string; port: number },
  scanner: MediaMalwareScanService,
  concurrency = 1,
): Worker {
  return new Worker(
    QUEUE_NAMES.mediaScan,
    async (job: Job) => {
      if (job.name !== MEDIA_SCAN_JOB_NAME)
        throw new Error('Unsupported media scan job.');
      const payload = validateMediaScanPayload(job.data);
      await scanner.process(payload.storageObjectId);
    },
    { connection, concurrency: Math.max(1, Math.min(concurrency, 4)) },
  );
}
