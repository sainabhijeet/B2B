import { DataSource } from 'typeorm';
import { FailedJob } from '../common/entities/failed-job.entity';
import { WorkerLog } from '../common/entities/worker-log.entity';

export async function logWorkerEvent(
  ds: DataSource,
  workerName: string,
  eventType: string,
  status: 'SUCCESS' | 'FAILED',
  errorMessage?: string,
) {
  const repo = ds.getRepository(WorkerLog);
  await repo.save(
    repo.create({
      workerName,
      eventType,
      status,
      errorMessage: errorMessage ?? null,
    }),
  );
}

export async function logFailedJob(
  ds: DataSource,
  workerName: string,
  queueName: string,
  eventType: string,
  payload: Record<string, unknown> | null,
  errorMessage: string,
) {
  const repo = ds.getRepository(FailedJob);
  await repo.save(
    repo.create({
      workerName,
      queueName,
      eventType,
      payloadJson: payload,
      errorMessage,
    }),
  );
}
