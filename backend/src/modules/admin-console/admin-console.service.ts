import { BadRequestException, ConflictException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdminModuleState } from '../../common/entities/admin-module-state.entity';
import { AdminMediaFile } from '../../common/entities/admin-media-file.entity';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SaveAdminModuleStateDto } from './dto/save-admin-module-state.dto';
import { UploadAdminMediaDto } from './dto/upload-admin-media.dto';
import * as os from 'node:os';
import { PrivateDocumentsService } from '../private-documents/private-documents.service';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { AppQueue, createAppQueue } from '../../workers/queue-factory';
import { QUEUE_NAMES } from '../../workers/queues';
import { BuildJob } from '../../common/entities/build-job.entity';

type CountRow = { count: string };
type TenantCatalogStats = {
  tenantId: string;
  orders: number;
  ordersToday: number;
  products: number;
  orderTrend: Array<{ bucket: string; label: string; value: number }>;
};

@Injectable()
export class AdminConsoleService implements OnModuleDestroy {
  private readonly buildQueue: AppQueue;
  private readonly mutableModules = new Set([
    'coupons',
    'feature_flags',
    'media',
    'monitoring_alerts',
    'notification_templates',
    'rbac',
    'scheduler',
  ]);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(AdminModuleState)
    private readonly moduleStates: Repository<AdminModuleState>,
    @InjectRepository(AdminMediaFile)
    private readonly mediaRepository: Repository<AdminMediaFile>,
    private readonly auditLogs: AuditLogsService,
    private readonly privateDocuments: PrivateDocumentsService,
    config: ConfigService,
  ) {
    this.buildQueue = createAppQueue(QUEUE_NAMES.build, config);
  }

  async onModuleDestroy(): Promise<void> {
    await this.buildQueue.close();
  }

  private async count(sql: string, params: unknown[] = []): Promise<number> {
    const rows = (await this.dataSource.query(sql, params)) as CountRow[];
    return Number(rows[0]?.count ?? 0);
  }

  async analyticsOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const catalogStatsPromise = this.tenantCatalogStats(today);
    const [
      totalTenants,
      activeTenants,
      newTenantsToday,
      totalCustomers,
      newBuildsToday,
      productsAddedToday,
      notificationsSentToday,
      catalogStats,
    ] = await Promise.all([
      this.count('SELECT COUNT(*)::text AS count FROM tenants'),
      this.count("SELECT COUNT(*)::text AS count FROM tenants WHERE status = 'ACTIVE'"),
      this.count('SELECT COUNT(*)::text AS count FROM tenants WHERE created_at >= $1', [today]),
      this.count('SELECT COUNT(*)::text AS count FROM customers WHERE deleted_at IS NULL'),
      this.count("SELECT COUNT(*)::text AS count FROM build_jobs WHERE created_at >= date_trunc('day', now())"),
      this.count(
        "SELECT COUNT(*)::text AS count FROM audit_logs WHERE created_at >= date_trunc('day', now()) AND action ~* 'PRODUCT.*(CREATE|ADD)'",
      ),
      this.count("SELECT COUNT(*)::text AS count FROM notifications WHERE created_at >= date_trunc('day', now())"),
      catalogStatsPromise,
    ]);
    const totalOrders = catalogStats.reduce((sum, row) => sum + row.orders, 0);
    const ordersToday = catalogStats.reduce((sum, row) => sum + row.ordersToday, 0);
    const totalProducts = catalogStats.reduce((sum, row) => sum + row.products, 0);

    const tenantGrowth = (await this.dataSource.query(`
      SELECT to_char(date_trunc('month', created_at), 'Mon YY') AS label, COUNT(*)::int AS value
      FROM tenants
      WHERE created_at >= now() - interval '12 months'
      GROUP BY 1, date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at)
    `)) as { label: string; value: number }[];

    const trendByBucket = new Map<string, { label: string; value: number }>();
    for (const tenant of catalogStats) {
      for (const point of tenant.orderTrend) {
        const current = trendByBucket.get(point.bucket);
        trendByBucket.set(point.bucket, {
          label: point.label,
          value: (current?.value ?? 0) + Number(point.value),
        });
      }
    }
    const orderTrend = [...trendByBucket.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, point]) => point);

    return {
      success: true,
      data: {
        overview: {
          totalTenants,
          activeTenants,
          newTenantsToday,
          newBuildsToday,
          productsAddedToday,
          notificationsSentToday,
          totalOrders,
          ordersToday,
          totalProducts,
          totalCustomers,
        },
        tenantGrowth,
        orderTrend,
      },
      meta: {},
      message: '',
    };
  }

  async tenantAnalytics() {
    const [rows, catalogStats] = await Promise.all([this.dataSource.query(`
      SELECT
        t.id,
        t.name,
        COALESCE(p.name, 'Unassigned') AS plan,
        COALESCE(c.name, 'Unassigned') AS country,
        t.status = 'ACTIVE' AS active,
        t.created_at AS "createdAt"
      FROM tenants t
      LEFT JOIN plans p ON p.id = t.plan_id
      LEFT JOIN countries c ON c.country_id = t.country_id
      ORDER BY t.created_at DESC
    `), this.tenantCatalogStats(new Date(0))]) as [{
      id: string;
      name: string;
      plan: string;
      country: string;
      active: boolean;
      createdAt: Date;
    }[], TenantCatalogStats[]];
    const statsByTenant = new Map(catalogStats.map((row) => [row.tenantId, row]));

    return {
      success: true,
      data: rows
        .map((row) => ({
          ...row,
          industry: 'Unassigned',
          orders: statsByTenant.get(row.id)?.orders ?? 0,
          products: statsByTenant.get(row.id)?.products ?? 0,
        }))
        .sort((a, b) => b.orders - a.orders || b.createdAt.getTime() - a.createdAt.getTime()),
      meta: {},
      message: '',
    };
  }

  async revenueAnalytics() {
    const [totals, renewalRows, planRows, growthRows] = await Promise.all([
      this.dataSource.query(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('month', now())), 0)::numeric AS monthly,
          COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('year', now())), 0)::numeric AS annual
        FROM payments
        WHERE payment_status = 'SUCCESS'
      `) as Promise<Array<{ monthly: string; annual: string }>>,
      this.dataSource.query(`
        SELECT COUNT(*) FILTER (WHERE payment_count >= 2)::int AS renewed,
               COUNT(*)::int AS paid
        FROM (
          SELECT tenant_id, COUNT(*)::int AS payment_count
          FROM payments
          WHERE payment_status = 'SUCCESS'
          GROUP BY tenant_id
        ) paid_tenants
      `) as Promise<Array<{ renewed: number; paid: number }>>,
      this.dataSource.query(`
        SELECT LOWER(COALESCE(plan_name, 'free')) AS plan, COUNT(*)::int AS count
        FROM subscriptions
        WHERE status IN ('ACTIVE', 'TRIAL')
        GROUP BY 1
      `) as Promise<Array<{ plan: string; count: number }>>,
      this.dataSource.query(`
        SELECT to_char(date_trunc('month', created_at), 'Mon YY') AS label,
               ROUND((SUM(amount) / 1000.0)::numeric, 2)::float AS value
        FROM payments
        WHERE payment_status = 'SUCCESS' AND created_at >= now() - interval '12 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      `) as Promise<Array<{ label: string; value: number }>>,
    ]);
    const planTotal = planRows.reduce((sum, row) => sum + Number(row.count), 0) || 1;
    const planCount = (name: string) =>
      planRows.filter((row) => row.plan.includes(name)).reduce((sum, row) => sum + Number(row.count), 0);
    const paid = Number(renewalRows[0]?.paid ?? 0);
    const renewed = Number(renewalRows[0]?.renewed ?? 0);
    return this.envelope({
      analytics: {
        monthlyInr: Number(totals[0]?.monthly ?? 0),
        annualInr: Number(totals[0]?.annual ?? 0),
        renewalRatePercent: paid ? Math.round((renewed / paid) * 100) : 0,
        planFreePercent: Math.round((planCount('free') / planTotal) * 100),
        planBasicPercent: Math.round((planCount('basic') / planTotal) * 100),
        planPremiumPercent: Math.round((planCount('premium') / planTotal) * 100),
      },
      growthSeries: growthRows,
    });
  }

  async buildAnalytics() {
    const [summaryRows, trendRows, failureRows] = await Promise.all([
      this.dataSource.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS "buildsToday",
          COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS "totalBuildsWeek",
          COUNT(*) FILTER (WHERE status = 'SUCCESS' AND created_at >= now() - interval '7 days')::int AS "successfulBuilds",
          COUNT(*) FILTER (WHERE status = 'FAILED' AND created_at >= now() - interval '7 days')::int AS "failedBuilds",
          COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))
            FILTER (WHERE completed_at IS NOT NULL AND started_at IS NOT NULL AND created_at >= now() - interval '7 days'), 0)::float AS "avgBuildTimeSec"
        FROM build_jobs
      `) as Promise<Array<Record<string, number>>>,
      this.dataSource.query(`
        SELECT to_char(date_trunc('day', created_at), 'Dy') AS label, COUNT(*)::int AS value
        FROM build_jobs
        WHERE created_at >= now() - interval '7 days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at)
      `) as Promise<Array<{ label: string; value: number }>>,
      this.dataSource.query(`
        SELECT CASE
          WHEN error_message ILIKE '%sign%' THEN 'Signing'
          WHEN error_message ILIKE '%depend%' THEN 'Dependencies'
          WHEN error_message ILIKE '%timeout%' THEN 'Timeout'
          WHEN error_message ILIKE '%config%' THEN 'Configuration'
          ELSE 'Other'
        END AS label, COUNT(*)::int AS value
        FROM build_jobs
        WHERE status = 'FAILED' AND created_at >= now() - interval '30 days'
        GROUP BY 1 ORDER BY value DESC
      `) as Promise<Array<{ label: string; value: number }>>,
    ]);
    const summary = summaryRows[0] ?? {};
    const successful = Number(summary.successfulBuilds ?? 0);
    const failed = Number(summary.failedBuilds ?? 0);
    return this.envelope({
      summary: {
        buildsToday: Number(summary.buildsToday ?? 0),
        totalBuildsWeek: Number(summary.totalBuildsWeek ?? 0),
        successfulBuilds: successful,
        failedBuilds: failed,
        successRatePercent: successful + failed ? Math.round((successful / (successful + failed)) * 100) : 0,
        avgBuildTimeSec: Math.round(Number(summary.avgBuildTimeSec ?? 0)),
      },
      trendSeries: trendRows,
      failureSeries: failureRows,
    });
  }

  async usageAnalytics() {
    const [requestRows, notificationCount, activeUsers, storageRows, apiSeries, storageSeries] =
      await Promise.all([
        this.dataSource.query(`
          SELECT COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today,
                 COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS week
          FROM api_request_logs
        `) as Promise<Array<{ today: number; week: number }>>,
        this.count(`SELECT COUNT(*)::text AS count FROM notifications WHERE created_at >= date_trunc('day', now())`),
        this.count(`SELECT COUNT(*)::text AS count FROM users WHERE deleted_at IS NULL`),
        this.dataSource.query(`SELECT COALESCE(SUM(file_size), 0)::text AS bytes FROM build_artifacts`) as Promise<Array<{ bytes: string }>>,
        this.dataSource.query(`
          SELECT to_char(date_trunc('day', created_at), 'Dy') AS label,
                 ROUND((COUNT(*) / 1000.0)::numeric, 2)::float AS value
          FROM api_request_logs
          WHERE created_at >= now() - interval '7 days'
          GROUP BY date_trunc('day', created_at)
          ORDER BY date_trunc('day', created_at)
        `) as Promise<Array<{ label: string; value: number }>>,
        this.dataSource.query(`
          SELECT to_char(date_trunc('month', created_at), 'Mon YY') AS label,
                 ROUND((SUM(file_size) / 1099511627776.0)::numeric, 4)::float AS value
          FROM build_artifacts
          WHERE created_at >= now() - interval '12 months'
          GROUP BY date_trunc('month', created_at)
          ORDER BY date_trunc('month', created_at)
        `) as Promise<Array<{ label: string; value: number }>>,
      ]);
    const usedBytes = Number(storageRows[0]?.bytes ?? 0);
    const limitBytes = Math.max(Number(process.env.STORAGE_LIMIT_BYTES) || 0, usedBytes);
    return this.envelope({
      snapshot: {
        apiRequestsToday: Number(requestRows[0]?.today ?? 0),
        apiRequestsWeek: Number(requestRows[0]?.week ?? 0),
        storageUsedTb: Number((usedBytes / 1099511627776).toFixed(4)),
        storageLimitTb: Number((limitBytes / 1099511627776).toFixed(4)),
        notificationsSentToday: notificationCount,
        activeUsers,
      },
      apiUsageSeries: apiSeries,
      storageGrowthSeries: storageSeries,
    });
  }

  async systemHealth() {
    const [queueLength, activeWorkers, requestCount, storageRows] = await Promise.all([
      this.count(`SELECT COUNT(*)::text AS count FROM build_jobs WHERE status IN ('PENDING', 'QUEUED')`),
      this.count(`SELECT COUNT(*)::text AS count FROM worker_nodes WHERE status <> 'OFFLINE' AND last_heartbeat >= now() - interval '2 minutes'`),
      this.count(`SELECT COUNT(*)::text AS count FROM api_request_logs WHERE created_at >= now() - interval '1 minute'`),
      this.dataSource.query(`SELECT COALESCE(SUM(file_size), 0)::text AS bytes FROM build_artifacts`) as Promise<Array<{ bytes: string }>>,
    ]);
    const cpuCount = Math.max(os.cpus().length, 1);
    const cpuPercent = Math.min(100, Math.round((os.loadavg()[0] / cpuCount) * 100));
    const memoryPercent = Math.min(100, Math.round((1 - os.freemem() / os.totalmem()) * 100));
    const usedBytes = Number(storageRows[0]?.bytes ?? 0);
    const limitBytes = Number(process.env.STORAGE_LIMIT_BYTES) || 0;
    const diskPercent = limitBytes ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;
    const requestsPerSec = Number((requestCount / 60).toFixed(2));
    const label = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const health = { cpuPercent, memoryPercent, diskPercent, queueLength, activeWorkers, requestsPerSec };
    return this.envelope({
      ...health,
      health,
      cpuSeries: [{ label, value: cpuPercent }],
      memorySeries: [{ label, value: memoryPercent }],
      queueSeries: [{ label, value: queueLength }],
    });
  }

  async activityLogs(limitRaw?: string) {
    const limit = Math.min(Math.max(Number(limitRaw) || 100, 1), 500);
    const rows = (await this.dataSource.query(
      `
        SELECT
          a.id,
          COALESCE(u.email, u.phone, 'System') AS "user",
          a.action,
          a.action AS "eventType",
          initcap(split_part(replace(a.action, '.', '_'), '_', 1)) AS module,
          CASE
            WHEN a.action ~* '(AUTH|LOGIN|PASSWORD|TOKEN|SECURITY)' THEN 'security'
            WHEN a.tenant_id IS NOT NULL THEN 'tenant'
            WHEN a.actor_user_id IS NOT NULL THEN 'admin'
            ELSE 'system'
          END AS category,
          a.tenant_id::text AS "tenantId",
          t.name AS "tenantName",
          COALESCE(NULLIF(a.metadata->>'message', ''), initcap(replace(replace(a.action, '_', ' '), '.', ' '))) AS message,
          COALESCE(a.metadata->>'ip', '') AS ip,
          a.created_at AS timestamp
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.actor_user_id
        LEFT JOIN tenants t ON t.id = a.tenant_id
        ORDER BY a.created_at DESC
        LIMIT $1
      `,
      [limit],
    )) as unknown[];

    return { success: true, data: rows, meta: { limit }, message: '' };
  }

  async apiLogs(limitRaw?: string) {
    const limit = this.logLimit(limitRaw);
    const rows = await this.dataSource.query(
      `SELECT id, endpoint, method, status_code AS status, latency_ms AS "latencyMs",
              tenant_id AS "tenantId", created_at AS timestamp
       FROM api_request_logs ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return this.envelope(rows, { limit });
  }

  async errorLogs(limitRaw?: string) {
    const limit = this.logLimit(limitRaw);
    const rows = await this.dataSource.query(
      `SELECT id,
              COALESCE(error_type, 'HttpError') AS "errorType",
              split_part(trim(leading '/' from endpoint), '/', 3) AS module,
              'HTTP ' || status_code::text || ' response from ' || endpoint AS message,
              '' AS "stackTrace",
              created_at AS timestamp
       FROM api_request_logs
       WHERE status_code >= 400
       ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return this.envelope(rows, { limit });
  }

  async loginLogs(limitRaw?: string) {
    const limit = this.logLimit(limitRaw);
    const rows = await this.dataSource.query(
      `SELECT a.id,
              COALESCE(u.email, u.phone, 'Unknown user') AS "user",
              COALESCE(a.metadata->>'ip', '') AS ip,
              COALESCE(a.metadata->>'deviceId', '') AS device,
              'success' AS status,
              a.created_at AS timestamp
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE a.action LIKE 'AUTH_%LOGIN%'
       ORDER BY a.created_at DESC LIMIT $1`,
      [limit],
    );
    return this.envelope(rows, { limit });
  }

  async buildLogs(limitRaw?: string) {
    const limit = this.logLimit(limitRaw);
    const rows = (await this.dataSource.query(
      `SELECT COALESCE(l.id, j.id) AS id,
              j.id AS "buildId",
              COALESCE(t.name, j.tenant_id::text) AS tenant,
              LOWER(CASE WHEN j.status = 'PENDING' THEN 'QUEUED' ELSE j.status END) AS status,
              COALESCE(l.log_output, j.error_message, j.status) AS message,
              COALESCE(l.created_at, j.completed_at, j.started_at, j.created_at) AS timestamp
       FROM build_jobs j
       LEFT JOIN tenants t ON t.id = j.tenant_id
       LEFT JOIN LATERAL (
         SELECT id, log_output, created_at FROM build_logs
         WHERE build_job_id = j.id ORDER BY created_at DESC LIMIT 1
       ) l ON true
       ORDER BY COALESCE(l.created_at, j.completed_at, j.started_at, j.created_at) DESC
       LIMIT $1`,
      [limit],
    )) as Array<Record<string, unknown> & { message: string }>;
    return this.envelope(
      rows.map((row) => ({ ...row, message: this.redactLogMessage(row.message) })),
      { limit },
    );
  }

  async notificationLogs(limitRaw?: string) {
    const limit = this.logLimit(limitRaw);
    const rows = await this.dataSource.query(
      `SELECT n.id AS "notificationId",
              n.type AS "templateId",
              initcap(replace(n.type, '_', ' ')) AS "templateName",
              'push' AS channel,
              COALESCE(u.email, u.phone, n.user_id::text) AS recipient,
              LOWER(n.status) AS status,
              n.created_at AS "sentAt"
       FROM notifications n
       LEFT JOIN users u ON u.id = n.user_id
       ORDER BY n.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return this.envelope(rows, { limit });
  }

  async mediaFiles() {
    const rows = await this.mediaRepository.find({ order: { createdAt: 'DESC' }, take: 2000 });
    return this.envelope(rows.map((row) => this.toMediaRow(row)));
  }

  async uploadMedia(user: JwtUserPayload, dto: UploadAdminMediaDto, file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Media file is required.');
    const id = randomUUID();
    const stored = await this.privateDocuments.store({
      tenantId: 'platform',
      category: 'admin-media',
      ownerId: id,
      file,
    });
    const tags = [...new Set((dto.tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean))]
      .slice(0, 25);
    try {
      const saved = await this.mediaRepository.save(this.mediaRepository.create({
        id,
        fileName: stored.originalName,
        reference: stored.reference,
        mimeType: stored.contentType,
        sizeBytes: String(file.size),
        folderId: dto.folderId,
        module: dto.module,
        tags,
        description: dto.description ?? null,
        uploadedBy: user.sub,
      }));
      await this.auditLogs.log({
        action: 'ADMIN_MEDIA_UPLOADED',
        actorUserId: user.sub,
        metadata: { mediaId: saved.id, sizeBytes: saved.sizeBytes, mimeType: saved.mimeType },
      });
      return this.envelope(this.toMediaRow(saved));
    } catch (error) {
      await this.privateDocuments.delete(stored.reference);
      throw error;
    }
  }

  async deleteMedia(user: JwtUserPayload, id: string) {
    const row = await this.mediaRepository.findOne({ where: { id } });
    if (!row) throw new BadRequestException('Media file not found.');
    await this.mediaRepository.remove(row);
    await this.privateDocuments.delete(row.reference);
    await this.auditLogs.log({
      action: 'ADMIN_MEDIA_DELETED',
      actorUserId: user.sub,
      metadata: { mediaId: id },
    });
    return this.envelope({ id });
  }

  async runAdminJob(
    user: JwtUserPayload,
    jobKey: 'CLEAN_OLD_LOGS' | 'RETRY_FAILED_BUILDS',
  ) {
    const started = Date.now();
    const runId = randomUUID();
    let result: string;
    let queueId: string | null = null;
    if (jobKey === 'CLEAN_OLD_LOGS') {
      const retentionDays = Math.min(
        Math.max(Number(process.env.API_LOG_RETENTION_DAYS) || 30, 7),
        365,
      );
      const deleted = await this.dataSource.query(
        `DELETE FROM api_request_logs
         WHERE created_at < now() - ($1::text || ' days')::interval
         RETURNING id`,
        [retentionDays],
      ) as unknown[];
      result = `${deleted.length} expired API log rows deleted`;
    } else {
      const failed = await this.dataSource.getRepository(BuildJob).find({
        where: { status: 'FAILED' },
        order: { createdAt: 'ASC' },
        take: 20,
      });
      let queued = 0;
      for (const build of failed) {
        const previousError = build.errorMessage;
        build.status = 'QUEUED';
        build.startedAt = null;
        build.completedAt = null;
        build.errorMessage = null;
        await this.dataSource.getRepository(BuildJob).save(build);
        let queuedJob: unknown;
        try {
          queuedJob = await this.buildQueue.add(build.buildType, {
            buildJobId: build.id,
            tenantId: build.tenantId,
            buildType: build.buildType,
            packageName: build.packageName,
            appName: build.appName,
            themeId: build.themeId,
            languages: build.languages,
            priority: build.priority,
          }, { priority: build.priority, attempts: 2 });
          if ((queuedJob as { skipped?: boolean })?.skipped) {
            throw new BadRequestException('Build queue is disabled; failed builds were not changed.');
          }
        } catch (error) {
          build.status = 'FAILED';
          build.errorMessage = previousError;
          await this.dataSource.getRepository(BuildJob).save(build);
          throw error;
        }
        queueId = String((queuedJob as { id?: unknown })?.id ?? queueId ?? '');
        queued += 1;
      }
      result = `${queued} failed build jobs queued`;
    }
    const executedAt = new Date();
    const durationMs = Date.now() - started;
    await this.auditLogs.log({
      action: 'ADMIN_SCHEDULER_JOB_RUN',
      actorUserId: user.sub,
      metadata: { runId, jobKey, durationMs, result },
    });
    return this.envelope({
      runId,
      jobKey,
      status: 'success',
      durationMs,
      result,
      executedAt,
      queueId,
    });
  }

  async getModuleState(moduleKeyRaw: string) {
    const moduleKey = this.validateModuleKey(moduleKeyRaw);
    const row = await this.moduleStates.findOne({ where: { moduleKey } });
    return {
      success: true,
      data: row
        ? { payload: row.payload, version: row.version, updatedAt: row.updatedAt }
        : null,
      meta: {},
      message: '',
    };
  }

  async saveModuleState(
    moduleKeyRaw: string,
    dto: SaveAdminModuleStateDto,
    user: JwtUserPayload,
  ) {
    const moduleKey = this.validateModuleKey(moduleKeyRaw);
    const serialized = JSON.stringify(dto.payload);
    if (serialized === undefined) throw new BadRequestException('Module payload is required.');
    if (Buffer.byteLength(serialized, 'utf8') > 1024 * 1024) {
      throw new BadRequestException('Module payload exceeds the 1 MB limit.');
    }
    const existing = await this.moduleStates.findOne({ where: { moduleKey } });
    if (dto.version && existing && existing.version !== dto.version) {
      throw new ConflictException('Module state changed; reload before saving.');
    }
    const saved = await this.moduleStates.save(
      this.moduleStates.create({
        ...(existing ?? {}),
        moduleKey,
        payload: dto.payload,
        updatedBy: user.sub,
      }),
    );
    await this.auditLogs.log({
      action: 'ADMIN_MODULE_STATE_UPDATED',
      actorUserId: user.sub,
      metadata: { moduleKey, version: saved.version },
    });
    return {
      success: true,
      data: { payload: saved.payload, version: saved.version, updatedAt: saved.updatedAt },
      meta: {},
      message: '',
    };
  }

  private validateModuleKey(raw: string): string {
    const moduleKey = String(raw ?? '').trim().toLowerCase();
    if (!this.mutableModules.has(moduleKey)) {
      throw new BadRequestException('Unsupported admin module.');
    }
    return moduleKey;
  }

  private logLimit(raw?: string): number {
    return Math.min(Math.max(Number(raw) || 200, 1), 1000);
  }

  private envelope<T>(data: T, meta: Record<string, unknown> = {}) {
    return { success: true, data, meta, message: '' };
  }

  private redactLogMessage(value: unknown): string {
    return String(value ?? '')
      .replace(/(authorization|token|secret|password|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
      .slice(0, 2000);
  }

  private toMediaRow(row: AdminMediaFile) {
    const fileType = row.mimeType.startsWith('image/')
      ? 'image'
      : row.mimeType === 'application/pdf'
        ? 'document'
        : 'other';
    return {
      fileId: row.id,
      fileName: row.fileName,
      filePath: this.privateDocuments.sign(row.reference, 900),
      fileType,
      fileSizeBytes: Number(row.sizeBytes),
      module: row.module,
      uploadedBy: row.uploadedBy ?? 'System',
      createdAt: row.createdAt,
      folderId: row.folderId,
      visibility: 'private',
      tags: row.tags,
      description: row.description ?? '',
    };
  }

  private async tenantCatalogStats(today: Date): Promise<TenantCatalogStats[]> {
    const tenants = (await this.dataSource.query(
      `SELECT id, schema_name AS "schemaName", tenant_schema_provisioned AS provisioned FROM tenants`,
    )) as Array<{ id: string; schemaName: string; provisioned: boolean }>;
    return Promise.all(
      tenants.map(async (tenant) => {
        const isTenantSchema =
          tenant.provisioned && /^t_[a-f0-9]{32}$/.test(tenant.schemaName ?? '');
        const schema = isTenantSchema ? `"${tenant.schemaName}"` : 'public';
        try {
          const [counts, trend] = await Promise.all([
            this.dataSource.query(
              `SELECT
                 (SELECT COUNT(*)::int FROM ${schema}.orders WHERE tenant_id = $2 AND deleted_at IS NULL) AS orders,
                 (SELECT COUNT(*)::int FROM ${schema}.orders WHERE tenant_id = $2 AND deleted_at IS NULL AND created_at >= $1) AS "ordersToday",
                 (SELECT COUNT(*)::int FROM ${schema}.products WHERE tenant_id = $2 AND deleted_at IS NULL) AS products`,
              [today, tenant.id],
            ) as Promise<Array<{ orders: number; ordersToday: number; products: number }>>,
            this.dataSource.query(
              `SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS bucket,
                      to_char(date_trunc('week', created_at), 'Mon DD') AS label,
                      COUNT(*)::int AS value
               FROM ${schema}.orders
               WHERE tenant_id = $1 AND deleted_at IS NULL AND created_at >= now() - interval '12 weeks'
               GROUP BY date_trunc('week', created_at)
               ORDER BY date_trunc('week', created_at)`,
              [tenant.id],
            ) as Promise<Array<{ bucket: string; label: string; value: number }>>,
          ]);
          return {
            tenantId: tenant.id,
            orders: Number(counts[0]?.orders ?? 0),
            ordersToday: Number(counts[0]?.ordersToday ?? 0),
            products: Number(counts[0]?.products ?? 0),
            orderTrend: trend,
          };
        } catch {
          return { tenantId: tenant.id, orders: 0, ordersToday: 0, products: 0, orderTrend: [] };
        }
      }),
    );
  }
}
