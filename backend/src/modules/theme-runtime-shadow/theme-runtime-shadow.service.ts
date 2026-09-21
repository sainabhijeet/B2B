import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { readThemeMigrationFlags } from '../../common/observability/theme-migration-flags';
import { writeThemeMigrationLog } from '../../common/observability/theme-migration-log';
import { ThemeRuntimeComparisonReportEntity } from './entities/theme-runtime-comparison-report.entity';
import { CanonicalRuntimeResolver } from './canonical-runtime.resolver';
import {
  compareRuntimeResources,
  hashRuntimeResponse,
} from './runtime-comparison.engine';
import type {
  RuntimeChannel,
  RuntimeComparisonReport,
} from './runtime-contracts';
import { ThemeRuntimeShadowQueue } from './theme-runtime-shadow.queue';
import { ThemePlatformMetricsService } from '../../common/observability/theme-platform-metrics.service';
import { LessThan } from 'typeorm';
import { EnterpriseAuditService } from '../../common/observability/enterprise-audit.service';
import {
  boundRuntimeReport,
  decodeReportCursor,
  encodeReportCursor,
} from './runtime-report-hardening';

@Injectable()
export class ThemeRuntimeShadowService {
  private readonly logger = new Logger(ThemeRuntimeShadowService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly canonical: CanonicalRuntimeResolver,
    private readonly queue: ThemeRuntimeShadowQueue,
    private readonly platformMetrics: ThemePlatformMetricsService,
    private readonly audit: EnterpriseAuditService,
  ) {}

  async compare(input: {
    requestId: string;
    tenantId: string;
    channel: RuntimeChannel;
    legacyResponse: unknown;
    legacyDurationMs: number;
  }): Promise<RuntimeComparisonReport | null> {
    const flags = readThemeMigrationFlags(this.config);
    if (!flags.runtimeShadowEnabled) return null;
    return this.queue.execute((signal) => this.compareNow(input, signal));
  }

  private async compareNow(
    input: {
      requestId: string;
      tenantId: string;
      channel: RuntimeChannel;
      legacyResponse: unknown;
      legacyDurationMs: number;
    },
    signal: AbortSignal,
  ): Promise<RuntimeComparisonReport | null> {
    const flags = readThemeMigrationFlags(this.config);
    const started = Date.now();
    const legacyHash = hashRuntimeResponse(input.legacyResponse);
    try {
      const canonical = await this.canonical.resolve(
        input.tenantId,
        input.channel,
        signal,
      );
      const report: RuntimeComparisonReport = canonical
        ? compareRuntimeResources(
            this.legacyResources(input.legacyResponse, input.channel),
            canonical.resources,
            {
              schemaVersion: 1,
              requestId: input.requestId,
              tenantId: input.tenantId,
              channel: input.channel,
              legacyResponseHash: legacyHash,
              canonicalResponseHash: canonical.responseHash,
              legacyDurationMs: input.legacyDurationMs,
              canonicalDurationMs: Date.now() - started,
              generatedAt: new Date().toISOString(),
            },
          )
        : {
            schemaVersion: 1,
            requestId: input.requestId,
            tenantId: input.tenantId,
            channel: input.channel,
            status: 'UNAVAILABLE',
            legacyResponseHash: legacyHash,
            canonicalResponseHash: null,
            legacyDurationMs: input.legacyDurationMs,
            canonicalDurationMs: Date.now() - started,
            added: [],
            removed: [],
            changed: [],
            missing: [],
            compatibilityWarnings: [
              'No healthy canonical deployment is available.',
            ],
            generatedAt: new Date().toISOString(),
          };
      if (flags.runtimeComparisonStorageEnabled) {
        await this.store(report);
      }
      if (flags.runtimeMetricsEnabled) {
        this.platformMetrics.increment('runtime_shadow_requests');
        this.platformMetrics.increment(
          `runtime_shadow_comparison_${report.status.toLowerCase()}`,
        );
        this.platformMetrics.observe(
          'runtime_shadow_duration_ms',
          report.canonicalDurationMs ?? 0,
        );
        if (report.changed.length)
          this.platformMetrics.increment('runtime_shadow_differences');
      }
      if (flags.runtimeHealthEnabled && report.status === 'ERROR')
        this.platformMetrics.increment('runtime_shadow_health_errors');
      writeThemeMigrationLog({
        event: 'theme.runtime.shadow.completed',
        phase: 'phase-6',
        implementation: 'runtime-shadow-comparison',
        channel: input.channel,
        mode: report.status,
        durationMs: report.canonicalDurationMs,
        metadata: {
          requestId: input.requestId,
          tenantId: input.tenantId,
          legacyResponseHash: report.legacyResponseHash,
          canonicalResponseHash: report.canonicalResponseHash,
          runtimeResponseSource: 'legacy',
        },
      });
      return report;
    } catch (error) {
      this.logger.warn(
        `Runtime shadow comparison failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (flags.runtimeMetricsEnabled)
        this.platformMetrics.increment('runtime_shadow_errors');
      return null;
    }
  }

  async getReport(
    id: string,
  ): Promise<ThemeRuntimeComparisonReportEntity | null> {
    if (!readThemeMigrationFlags(this.config).runtimeComparisonStorageEnabled)
      return null;
    return this.dataSource
      .getRepository(ThemeRuntimeComparisonReportEntity)
      .findOne({ where: { id } });
  }

  async listReports(
    tenantId: string,
    channel: RuntimeChannel,
    limit = 50,
  ): Promise<ThemeRuntimeComparisonReportEntity[]> {
    if (!readThemeMigrationFlags(this.config).runtimeComparisonStorageEnabled)
      return [];
    return this.dataSource
      .getRepository(ThemeRuntimeComparisonReportEntity)
      .find({
        where: { tenantId, channel },
        order: { createdAt: 'DESC' },
        take: Math.min(Math.max(limit, 1), 100),
      });
  }

  async listReportsPage(
    tenantId: string,
    channel: RuntimeChannel,
    limit = 50,
    cursor?: string,
  ): Promise<{
    items: ThemeRuntimeComparisonReportEntity[];
    nextCursor: string | null;
  }> {
    if (!readThemeMigrationFlags(this.config).runtimeComparisonStorageEnabled)
      return { items: [], nextCursor: null };
    const repository = this.dataSource.getRepository(
      ThemeRuntimeComparisonReportEntity,
    );
    const size = Math.min(Math.max(limit, 1), 100);
    const parsed = cursor ? decodeReportCursor(cursor) : null;
    const query = repository
      .createQueryBuilder('report')
      .where('report.tenant_id = :tenantId AND report.channel = :channel', {
        tenantId,
        channel,
      })
      .orderBy('report.created_at', 'DESC')
      .addOrderBy('report.id', 'DESC')
      .take(size + 1);
    if (cursor && !parsed) return { items: [], nextCursor: null };
    if (parsed) {
      query.andWhere(
        '(report.created_at < :createdAt OR (report.created_at = :createdAt AND report.id < :id))',
        { createdAt: parsed.createdAt, id: parsed.id },
      );
    }
    const rows = await query.getMany();
    const hasMore = rows.length > size;
    const items = hasMore ? rows.slice(0, size) : rows;
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        hasMore && last ? encodeReportCursor(last.createdAt, last.id) : null,
    };
  }

  metricsSnapshot(): Record<string, number> {
    if (!readThemeMigrationFlags(this.config).runtimeMetricsEnabled) return {};
    return this.platformMetrics.snapshot().counters;
  }

  prometheusMetrics(): string {
    return this.platformMetrics.prometheus();
  }

  health(): {
    enabled: boolean;
    storageEnabled: boolean;
    metricsEnabled: boolean;
    runtimeResponseSource: 'legacy';
  } {
    const flags = readThemeMigrationFlags(this.config);
    return {
      enabled: flags.runtimeShadowEnabled,
      storageEnabled: flags.runtimeComparisonStorageEnabled,
      metricsEnabled: flags.runtimeMetricsEnabled,
      runtimeResponseSource: 'legacy',
    };
  }

  private async store(report: RuntimeComparisonReport): Promise<void> {
    const repository = this.dataSource.getRepository(
      ThemeRuntimeComparisonReportEntity,
    );
    const maxBytes = this.config.get<number>(
      'themeRuntimeShadow.reportMaxBytes',
      262144,
    );
    const safeReport = boundRuntimeReport(report, maxBytes);
    const retentionDays = this.config.get<number>(
      'themeRuntimeShadow.reportRetentionDays',
      30,
    );
    await repository.delete({
      createdAt: LessThan(new Date(Date.now() - retentionDays * 86400000)),
    });
    const existing = await repository.findOne({
      where: { requestId: report.requestId },
    });
    if (existing) return;
    try {
      await repository.insert({
        requestId: safeReport.requestId,
        tenantId: safeReport.tenantId,
        channel: safeReport.channel,
        legacyResponseHash: safeReport.legacyResponseHash,
        canonicalResponseHash: safeReport.canonicalResponseHash,
        legacyDurationMs: safeReport.legacyDurationMs,
        canonicalDurationMs: safeReport.canonicalDurationMs,
        status: safeReport.status,
        report: safeReport,
      } as never);
      await this.audit.record({
        domain: 'theme.runtime',
        action: 'comparison.report.stored',
        outcome: 'completed',
        resourceType: 'runtime_comparison_report',
        resourceId: safeReport.requestId,
        tenantId: safeReport.tenantId,
        actorUserId: null,
        requestId: safeReport.requestId,
        correlationId: safeReport.requestId,
        metadata: { status: safeReport.status },
      });
    } catch (error) {
      if (!(error instanceof Error) || !/duplicate|unique/i.test(error.message))
        throw error;
    }
  }

  private legacyResources(
    response: unknown,
    channel: RuntimeChannel,
  ): Record<string, unknown> {
    const data =
      response && typeof response === 'object'
        ? ((response as Record<string, unknown>).data ?? {})
        : {};
    const record =
      data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    return {
      theme: {
        id:
          record.webTheme && typeof record.webTheme === 'object'
            ? (record.webTheme as Record<string, unknown>).id
            : record.theme_id,
        channel,
      },
      templates:
        record.preview && typeof record.preview === 'object'
          ? ((record.preview as Record<string, unknown>).homeTemplate ?? {})
          : {},
      sections:
        record.contentOverrides && typeof record.contentOverrides === 'object'
          ? ((record.contentOverrides as Record<string, unknown>).pages ?? {})
          : {},
      blocks: {},
      components: {},
      tokens: record.tokenOverrides ?? record.config ?? {},
      assets:
        record.webTheme && typeof record.webTheme === 'object'
          ? {
              manifestPath: (record.webTheme as Record<string, unknown>)
                .manifestPath,
            }
          : {},
      locales: record.locales ?? {},
      runtimeConfiguration: record.config ?? {
        themeEngine: record.themeEngine,
      },
    };
  }
}
