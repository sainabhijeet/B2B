import 'dotenv/config';
import dataSource from '../database/data-source';
import { WorkerNode } from '../common/entities/worker-node.entity';

async function run() {
  await dataSource.initialize();
  const workerNodesRepo = dataSource.getRepository(WorkerNode);

  const hostname = process.env.MONITORING_WORKER_HOSTNAME ?? 'build-worker-1';
  const intervalMs = Number(process.env.MONITORING_HEARTBEAT_INTERVAL_MS ?? 30000);

  // eslint-disable-next-line no-console
  console.log(`Starting worker heartbeat for ${hostname} every ${intervalMs}ms`);

  const timer = setInterval(async () => {
    const configuredActiveJobs = Number(process.env.MONITORING_ACTIVE_JOBS ?? 0);
    const activeJobs = Number.isInteger(configuredActiveJobs) && configuredActiveJobs >= 0
      ? configuredActiveJobs
      : 0;
    let row = await workerNodesRepo.findOne({ where: { hostname } });
    if (!row) {
      row = workerNodesRepo.create({
        hostname,
        status: activeJobs > 0 ? 'BUSY' : 'ONLINE',
        activeJobs,
        lastHeartbeat: new Date(),
      });
    } else {
      row.status = activeJobs > 0 ? 'BUSY' : 'ONLINE';
      row.activeJobs = activeJobs;
      row.lastHeartbeat = new Date();
    }
    await workerNodesRepo.save(row);
    // eslint-disable-next-line no-console
    console.log(`[heartbeat] ${hostname} status=${row.status} active_jobs=${row.activeJobs}`);
  }, intervalMs);

  const shutdown = async () => {
    clearInterval(timer);
    if (dataSource.isInitialized) await dataSource.destroy();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

run().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error('Worker heartbeat failed:', error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
