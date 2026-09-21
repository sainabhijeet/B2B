import 'dotenv/config';
import dataSource from '../database/data-source';
import { BuildJob } from '../common/entities/build-job.entity';
import { BuildLog } from '../common/entities/build-log.entity';
import { BuildMetric } from '../common/entities/build-metric.entity';
import { WorkerNode } from '../common/entities/worker-node.entity';

async function run() {
  await dataSource.initialize();
  const buildJobsRepo = dataSource.getRepository(BuildJob);
  const buildLogsRepo = dataSource.getRepository(BuildLog);
  const buildMetricsRepo = dataSource.getRepository(BuildMetric);
  const workerNodesRepo = dataSource.getRepository(WorkerNode);

  const tenantId = process.env.MONITORING_SEED_TENANT_ID;
  if (!tenantId) {
    throw new Error('MONITORING_SEED_TENANT_ID is required in environment for monitoring seed.');
  }

  const jobs = await buildJobsRepo.find({
    where: { tenantId },
    order: { createdAt: 'DESC' },
    take: 3,
  });

  if (jobs.length === 0) {
    throw new Error(`No build_jobs found for tenant ${tenantId}. Create at least one build first.`);
  }

  for (const job of jobs) {
    const existingMetric = await buildMetricsRepo.findOne({ where: { buildJobId: job.id } });
    if (!existingMetric) {
      await buildMetricsRepo.save(
        buildMetricsRepo.create({
          buildJobId: job.id,
          queueWaitTimeMs: 60_000,
          buildDurationMs: 240_000,
          artifactSizeBytes: '10485760',
        }),
      );
    }

    const logCount = await buildLogsRepo.count({ where: { buildJobId: job.id } });
    if (logCount === 0) {
      await buildLogsRepo.save(
        buildLogsRepo.create({
          buildJobId: job.id,
          logLevel: 'INFO',
          logOutput: 'workspace prepared',
        }),
      );
      await buildLogsRepo.save(
        buildLogsRepo.create({
          buildJobId: job.id,
          logLevel: 'INFO',
          logOutput: 'firebase config injected',
        }),
      );
      await buildLogsRepo.save(
        buildLogsRepo.create({
          buildJobId: job.id,
          logLevel: job.status === 'FAILED' ? 'ERROR' : 'INFO',
          logOutput: job.status === 'FAILED' ? 'flutter build failed' : 'flutter build success',
        }),
      );
    }
  }

  const node = await workerNodesRepo.findOne({ where: { hostname: 'build-worker-1' } });
  if (!node) {
    await workerNodesRepo.save(
      workerNodesRepo.create({
        hostname: 'build-worker-1',
        status: 'ONLINE',
        activeJobs: 1,
        lastHeartbeat: new Date(),
      }),
    );
  }

  // eslint-disable-next-line no-console
  console.log(`Monitoring seed complete for tenant ${tenantId}.`);
  await dataSource.destroy();
}

run().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error('Monitoring seed failed:', error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
