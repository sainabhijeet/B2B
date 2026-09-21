import { Worker } from 'bullmq';
import { DataSource } from 'typeorm';
import { AnalyticsEvent } from '../common/entities/analytics-event.entity';
import { logFailedJob, logWorkerEvent } from './worker-log.util';
import { QUEUE_NAMES } from './queues';

export const createAnalyticsWorker = (
  connection: { host: string; port: number },
  ds: DataSource,
) =>
  new Worker(
    QUEUE_NAMES.analytics,
    async (job) => {
      const eventType = job.name;
      try {
        const repo = ds.getRepository(AnalyticsEvent);
        await repo.save(
          repo.create({
            tenantId: String(job.data.tenantId ?? job.data.tenant_id ?? ''),
            userId: job.data.userId ?? job.data.user_id ?? null,
            eventType,
            entityType: (job.data.entityType as string | undefined) ?? null,
            entityId: (job.data.entityId as string | undefined) ?? null,
            metadataJson: { ...job.data },
          }),
        );
        await logWorkerEvent(ds, 'analytics_worker', eventType, 'SUCCESS');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logWorkerEvent(
          ds,
          'analytics_worker',
          eventType,
          'FAILED',
          errorMessage,
        );
        await logFailedJob(
          ds,
          'analytics_worker',
          QUEUE_NAMES.analytics,
          eventType,
          job.data as Record<string, unknown>,
          errorMessage,
        );
        throw error;
      }
    },
    {
      connection,
      concurrency: 10,
    },
  );
