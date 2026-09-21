import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { BuildJob } from '../../common/entities/build-job.entity';
import { BuildLog } from '../../common/entities/build-log.entity';
import { BuildMetric } from '../../common/entities/build-metric.entity';
import { WorkerNode } from '../../common/entities/worker-node.entity';
import { QUEUE_NAMES } from '../../workers/queues';
import { AppQueue, areQueuesEnabled, createAppQueue } from '../../workers/queue-factory';
import { BuildListQueryDto } from './dto/build-list-query.dto';
import { WorkerHeartbeatDto } from './dto/worker-heartbeat.dto';

@Injectable()
export class MonitoringService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly queuesEnabled: boolean;
  private readonly buildQueue: AppQueue;
  private readonly notificationQueue: AppQueue;
  private readonly analyticsQueue: AppQueue;

  constructor(
    @InjectRepository(BuildJob)
    private readonly buildJobsRepo: Repository<BuildJob>,
    @InjectRepository(BuildMetric)
    private readonly buildMetricsRepo: Repository<BuildMetric>,
    @InjectRepository(BuildLog)
    private readonly buildLogsRepo: Repository<BuildLog>,
    @InjectRepository(WorkerNode)
    private readonly workerNodesRepo: Repository<WorkerNode>,
    configService: ConfigService,
  ) {
    this.queuesEnabled = areQueuesEnabled(configService);
    const host = configService.get<string>('REDIS_HOST') ?? process.env.REDIS_HOST ?? '127.0.0.1';
    const port = Number(configService.get<string>('REDIS_PORT') ?? process.env.REDIS_PORT ?? 6379);
    this.redis = new Redis({ host, port, lazyConnect: true, maxRetriesPerRequest: 1 });
    this.buildQueue = createAppQueue(QUEUE_NAMES.build, configService);
    this.notificationQueue = createAppQueue(QUEUE_NAMES.notification, configService);
    this.analyticsQueue = createAppQueue(QUEUE_NAMES.analytics, configService);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.buildQueue.close(),
      this.notificationQueue.close(),
      this.analyticsQueue.close(),
    ]);
    if (this.redis.status !== 'end') {
      await this.redis.quit();
    }
  }

  async getBuildMetrics() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const total = await this.buildJobsRepo.count({ where: { createdAt: Between(start, end) } });
    const successful = await this.buildJobsRepo.count({
      where: { createdAt: Between(start, end), status: 'SUCCESS' },
    });
    const failed = await this.buildJobsRepo.count({
      where: { createdAt: Between(start, end), status: 'FAILED' },
    });
    const rows = await this.buildMetricsRepo.find({
      where: { createdAt: Between(start, end) },
    });

    const avgBuildTime = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.buildDurationMs, 0) / rows.length / 1000)
      : 0;
    const avgQueueWait = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.queueWaitTimeMs, 0) / rows.length / 1000)
      : 0;

    return {
      success: true,
      data: {
        total_builds_today: total,
        successful_builds: successful,
        failed_builds: failed,
        avg_build_time: avgBuildTime,
        avg_queue_wait_time: avgQueueWait,
      },
      meta: {},
      message: '',
    };
  }

  async listBuildJobs(query: BuildListQueryDto) {
    const qb = this.buildJobsRepo.createQueryBuilder('b').leftJoin(BuildMetric, 'm', 'm.build_job_id = b.id');
    if (query.tenantId) qb.andWhere('b.tenant_id = :tenantId', { tenantId: query.tenantId });
    if (query.status) qb.andWhere('b.status = :status', { status: query.status });
    if (query.fromDate) qb.andWhere('b.created_at >= :fromDate', { fromDate: query.fromDate });
    if (query.toDate) qb.andWhere('b.created_at <= :toDate', { toDate: query.toDate });
    qb.orderBy('b.created_at', 'DESC').limit(200);

    const rows = await qb
      .select([
        'b.id AS build_job_id',
        'b.tenant_id AS tenant_id',
        'b.status AS status',
        'COALESCE(m.build_duration_ms, 0) AS duration',
        'b.created_at AS created_at',
      ])
      .getRawMany();
    return { success: true, data: rows, meta: {}, message: '' };
  }

  async getBuildLogs(buildJobId: string) {
    const logs = await this.buildLogsRepo.find({
      where: { buildJobId },
      order: { createdAt: 'ASC' },
      take: 2000,
    });
    return {
      success: true,
      data: {
        logs: logs.map((log) => `[${log.createdAt.toISOString()}] [${log.logLevel}] ${log.logOutput}`),
      },
      meta: {},
      message: '',
    };
  }

  async getQueueStats() {
    const [build, notifications, analytics] = await Promise.all([
      this.buildQueue.getJobCounts('waiting', 'active', 'failed', 'completed', 'delayed'),
      this.notificationQueue.getJobCounts('waiting', 'active', 'failed', 'completed', 'delayed'),
      this.analyticsQueue.getJobCounts('waiting', 'active', 'failed', 'completed', 'delayed'),
    ]);
    return {
      success: true,
      data: {
        build_queue: build,
        notification_queue: notifications,
        analytics_queue: analytics,
      },
      meta: {},
      message: '',
    };
  }

  async getWorkers() {
    const rows = await this.workerNodesRepo.find({ order: { updatedAt: 'DESC' } });
    return { success: true, data: { workers: rows }, meta: {}, message: '' };
  }

  async heartbeat(dto: WorkerHeartbeatDto) {
    let row = await this.workerNodesRepo.findOne({ where: { hostname: dto.hostname } });
    if (!row) {
      row = this.workerNodesRepo.create({
        hostname: dto.hostname,
        status: dto.status ?? (dto.activeJobs > 0 ? 'BUSY' : 'ONLINE'),
        activeJobs: dto.activeJobs,
        lastHeartbeat: new Date(),
      });
    } else {
      row.status = dto.status ?? (dto.activeJobs > 0 ? 'BUSY' : 'ONLINE');
      row.activeJobs = dto.activeJobs;
      row.lastHeartbeat = new Date();
    }
    const saved = await this.workerNodesRepo.save(row);
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async getSystemHealth() {
    let db = 'OK';
    let redis = 'OK';
    let workers = 'OK';
    try {
      await this.buildJobsRepo.query('SELECT 1');
    } catch {
      db = 'ERROR';
    }
    if (this.queuesEnabled) {
      try {
        await this.redis.ping();
      } catch {
        redis = 'ERROR';
      }
    } else {
      redis = 'DISABLED';
    }
    const threshold = new Date(Date.now() - 2 * 60_000);
    const activeWorkers = await this.workerNodesRepo.count({
      where: { lastHeartbeat: MoreThanOrEqual(threshold) },
    });
    if (activeWorkers === 0) workers = 'DEGRADED';
    return {
      success: true,
      data: {
        api: 'OK',
        database: db,
        redis,
        workers,
      },
      meta: {},
      message: '',
    };
  }

  async getBuildFailuresAnalytics() {
    const failed = await this.buildJobsRepo.find({ where: { status: 'FAILED' }, take: 500 });
    const map = {
      flutter_errors: 0,
      firebase_config_missing: 0,
      package_name_conflict: 0,
      other: 0,
    };
    for (const row of failed) {
      const msg = (row.errorMessage ?? '').toLowerCase();
      if (msg.includes('flutter')) map.flutter_errors += 1;
      else if (msg.includes('firebase') || msg.includes('google_services_json')) map.firebase_config_missing += 1;
      else if (msg.includes('applicationid') || msg.includes('package')) map.package_name_conflict += 1;
      else map.other += 1;
    }
    return { success: true, data: map, meta: {}, message: '' };
  }

  async getBuildPerformance() {
    const rows = await this.buildMetricsRepo.find({ take: 1000, order: { createdAt: 'DESC' } });
    const avgBuildDuration = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.buildDurationMs, 0) / rows.length / 1000)
      : 0;
    const maxBuildDuration = rows.length
      ? Math.round(Math.max(...rows.map((row) => row.buildDurationMs)) / 1000)
      : 0;
    const avgQueueWaitTime = rows.length
      ? Math.round(rows.reduce((sum, row) => sum + row.queueWaitTimeMs, 0) / rows.length / 1000)
      : 0;
    return {
      success: true,
      data: {
        avg_build_duration: avgBuildDuration,
        max_build_duration: maxBuildDuration,
        avg_queue_wait_time: avgQueueWaitTime,
      },
      meta: {},
      message: '',
    };
  }

  async getDashboard() {
    const metrics = await this.getBuildMetrics();
    const queue = await this.getQueueStats();
    const workers = await this.getWorkers();
    const total = metrics.data.total_builds_today || 0;
    const successRate = total > 0 ? Math.round((metrics.data.successful_builds / total) * 100) : 0;
    const queueLength =
      (queue.data.build_queue.waiting ?? 0) +
      (queue.data.notification_queue.waiting ?? 0) +
      (queue.data.analytics_queue.waiting ?? 0);
    const activeWorkers = workers.data.workers.filter((w: WorkerNode) => w.status !== 'OFFLINE').length;

    return {
      success: true,
      data: {
        build_success_rate: successRate,
        queue_length: queueLength,
        active_workers: activeWorkers,
        failed_builds_today: metrics.data.failed_builds,
      },
      meta: {},
      message: '',
    };
  }
}
