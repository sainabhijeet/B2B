import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { Worker } from 'bullmq';
import { AppModule } from '../app.module';
import { MediaMalwareScanService } from '../modules/media/media-malware-scan.service';
import { MediaScanQueueService } from '../modules/media/media-scan-queue.service';
import { createMediaScanWorker } from './media-scan.worker';

const connection = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
};

async function bootstrapMediaScanWorker(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const scanner = app.get(MediaMalwareScanService);
  const scanQueue = app.get(MediaScanQueueService);
  const worker: Worker = createMediaScanWorker(
    connection,
    scanner,
    Number(process.env.MEDIA_SCAN_WORKER_CONCURRENCY ?? 1),
  );

  await scanner.reconcilePromotions();
  for (const objectId of await scanner.recoverStaleScans()) {
    await scanQueue.enqueue(objectId);
  }

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    // eslint-disable-next-line no-console
    console.log(`Media scan worker shutdown requested by ${signal}`);
    await worker.close();
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  // eslint-disable-next-line no-console
  console.log('Media scan worker is ready for media_scan_queue.');
}

bootstrapMediaScanWorker().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Media scan worker bootstrap failed:', error);
  process.exit(1);
});
