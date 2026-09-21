import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { readThemeMigrationFlags } from '../../common/observability/theme-migration-flags';
import { writeThemeMigrationLog } from '../../common/observability/theme-migration-log';
import { ThemeReleaseCandidate } from '../theme-release-pipeline/entities/theme-release-candidate.entity';
import {
  ThemeEnterpriseDeployment,
  DeploymentChannel,
  DeploymentState,
} from './entities/theme-enterprise-deployment.entity';
import { ThemeDeploymentSnapshot } from './entities/theme-deployment-snapshot.entity';
import { ThemeDeploymentEvent } from './entities/theme-deployment-event.entity';
import { ThemeDeploymentQueueEntry } from './entities/theme-deployment-queue-entry.entity';
import { ThemeDeploymentLock } from './entities/theme-deployment-lock.entity';
import { ThemeDeploymentHealthCheck } from './entities/theme-deployment-health-check.entity';
import { ThemeDeploymentProgressEvent } from './entities/theme-deployment-progress.entity';
import { canTransition } from './theme-deployment-state-machine';
import { ThemeDeploymentMetricsService } from './theme-deployment-metrics.service';
import type {
  DeploymentActionRequest,
  DeploymentProgressRequest,
  DeploymentRequest,
  DeploymentView,
} from './theme-deployment.contracts';
import { EnterpriseAuditService } from '../../common/observability/enterprise-audit.service';

export type DeploymentActor = { userId: string | null; role: UserRole };

@Injectable()
export class ThemeDeploymentService {
  constructor(
    private readonly config: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly metrics: ThemeDeploymentMetricsService,
    private readonly audit: EnterpriseAuditService,
  ) {}

  async queue(
    input: DeploymentRequest,
    actor: DeploymentActor,
  ): Promise<DeploymentView> {
    this.ensureEnabled();
    this.ensurePermission(actor, 'queue');
    return this.transaction(async (manager) => {
      const existing = await manager
        .getRepository(ThemeEnterpriseDeployment)
        .findOne({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) return this.view(manager, existing);
      const candidate = await manager
        .getRepository(ThemeReleaseCandidate)
        .findOne({ where: { id: input.releaseCandidateId } });
      if (!candidate)
        throw new NotFoundException('Published release was not found.');
      if (candidate.status !== 'PUBLISHED')
        throw new ConflictException('Only published releases may be deployed.');
      if (!candidate.packageSha256)
        throw new ConflictException('Published release has no package hash.');
      const dependencyReport = this.validateDependencies(
        candidate,
        input.channel,
      );
      if (!dependencyReport.valid)
        throw new ConflictException('Deployment dependencies are invalid.');
      const scope = this.scope(
        input.tenantId,
        input.channel,
        input.environment,
      );
      await this.advisoryLock(manager, scope);
      const lockRepo = manager.getRepository(ThemeDeploymentLock);
      const currentLock = await lockRepo.findOne({
        where: {
          tenantId: input.tenantId,
          channel: input.channel,
          environment: input.environment,
        },
      });
      const activeDeployments = await manager.query(
        `
          SELECT d.id
          FROM "theme_enterprise_deployments" d
          JOIN LATERAL (
            SELECT e.to_state
            FROM "theme_deployment_events" e
            WHERE e.deployment_id = d.id
            ORDER BY e.sequence DESC
            LIMIT 1
          ) latest ON TRUE
          WHERE d.tenant_id = $1
            AND d.channel = $2
            AND d.environment = $3
            AND latest.to_state NOT IN ('ROLLEDBACK', 'CANCELLED', 'FAILED')
          LIMIT 1
        `,
        [input.tenantId, input.channel, input.environment],
      );
      if (activeDeployments.length > 0) {
        throw new ConflictException(
          'An active deployment already exists for this tenant scope.',
        );
      }
      if (currentLock && currentLock.expiresAt > new Date())
        throw new ConflictException(
          'An active deployment already exists for this tenant scope.',
        );
      if (currentLock) await lockRepo.remove(currentLock);
      const deploymentId = randomUUID();
      const snapshotId = randomUUID();
      const snapshotData = {
        candidateId: candidate.id,
        version: candidate.version,
        packageSha256: candidate.packageSha256,
        manifest: candidate.manifestJson,
        releaseMetadata: candidate.releaseMetadataJson,
        validationReport: candidate.validationReportJson,
      };
      const snapshotJson = snapshotData as Record<string, unknown>;
      const snapshotHash = createHash('sha256')
        .update(JSON.stringify(snapshotJson))
        .digest('hex');
      const deployment = manager
        .getRepository(ThemeEnterpriseDeployment)
        .create({
          id: deploymentId,
          idempotencyKey: input.idempotencyKey,
          tenantId: input.tenantId,
          channel: input.channel,
          environment: input.environment,
          releaseCandidateId: candidate.id,
          snapshotId,
          initialState: 'QUEUED',
          versionGraph: {
            root: candidate.version,
            dependencies: dependencyReport.dependencies,
          },
          dependencyReport,
          canaryMetadata: input.canaryMetadata ?? {},
          rolloutMetadata: input.rolloutMetadata ?? {},
          rollbackMetadata: input.rollbackMetadata ?? {},
          createdByUserId: actor.userId,
        });
      await manager
        .getRepository(ThemeEnterpriseDeployment)
        .insert(deployment as never);
      await manager.getRepository(ThemeDeploymentSnapshot).insert({
        id: snapshotId,
        deploymentId,
        releaseCandidateId: candidate.id,
        releaseVersion: candidate.version,
        packageSha256: candidate.packageSha256,
        manifest: candidate.manifestJson,
        snapshot: snapshotJson,
        snapshotHash,
      } as never);
      await manager.getRepository(ThemeDeploymentEvent).insert({
        deploymentId,
        sequence: 0,
        idempotencyKey: `${input.idempotencyKey}:queued`,
        fromState: null,
        toState: 'QUEUED',
        actorUserId: actor.userId,
        metadata: { audit: true },
      } as never);
      await this.audit.record(
        {
          domain: 'theme.deployment',
          action: 'queued',
          outcome: 'completed',
          resourceType: 'theme_deployment',
          resourceId: deploymentId,
          tenantId: input.tenantId,
          actorUserId: actor.userId,
          requestId: input.idempotencyKey,
          correlationId: input.idempotencyKey,
          metadata: { environment: input.environment, channel: input.channel },
        },
        manager,
      );
      await manager.getRepository(ThemeDeploymentQueueEntry).insert({
        deploymentId,
        priority: input.priority ?? 100,
        status: 'QUEUED',
        queueKey: input.idempotencyKey,
      });
      await lockRepo.insert({
        tenantId: input.tenantId,
        channel: input.channel,
        environment: input.environment,
        deploymentId,
        leaseToken: randomUUID(),
        expiresAt: new Date(Date.now() + this.leaseMs()),
      });
      this.metric('queued');
      this.log('queued', deployment, actor);
      return this.view(manager, deployment);
    });
  }

  async transition(
    deploymentId: string,
    input: DeploymentActionRequest,
    target: DeploymentState,
    actor: DeploymentActor,
  ): Promise<DeploymentView> {
    this.ensureEnabled();
    this.ensurePermission(actor, 'transition');
    return this.transaction(async (manager) => {
      const deployment = await this.getDeployment(manager, deploymentId);
      const scope = this.scope(
        deployment.tenantId,
        deployment.channel,
        deployment.environment,
      );
      await this.advisoryLock(manager, scope);
      const eventRepo = manager.getRepository(ThemeDeploymentEvent);
      const duplicate = await eventRepo.findOne({
        where: { deploymentId, idempotencyKey: input.idempotencyKey },
      });
      if (duplicate) return this.view(manager, deployment);
      const latest = await eventRepo.findOne({
        where: { deploymentId },
        order: { sequence: 'DESC' },
      });
      if (!latest)
        throw new ConflictException('Deployment state history is missing.');
      if (latest.sequence !== input.expectedSequence)
        throw new ConflictException('Deployment state sequence is stale.');
      if (!canTransition(latest.toState, target))
        throw new ConflictException(
          `Cannot transition deployment from ${latest.toState} to ${target}.`,
        );
      await eventRepo.insert({
        deploymentId,
        sequence: latest.sequence + 1,
        idempotencyKey: input.idempotencyKey,
        fromState: latest.toState,
        toState: target,
        actorUserId: actor.userId,
        metadata: { ...(input.metadata ?? {}), audit: true },
      } as never);
      await this.audit.record(
        {
          domain: 'theme.deployment',
          action: 'transitioned',
          outcome: 'completed',
          resourceType: 'theme_deployment',
          resourceId: deployment.id,
          tenantId: deployment.tenantId,
          actorUserId: actor.userId,
          requestId: input.idempotencyKey,
          correlationId: input.idempotencyKey,
          metadata: { target, sequence: latest.sequence + 1 },
        },
        manager,
      );
      const lock = await manager
        .getRepository(ThemeDeploymentLock)
        .findOne({ where: { deploymentId } });
      if (['ROLLEDBACK', 'CANCELLED'].includes(target)) {
        if (lock) await manager.getRepository(ThemeDeploymentLock).remove(lock);
      } else if (lock) {
        lock.expiresAt = new Date(Date.now() + this.leaseMs());
        await manager.getRepository(ThemeDeploymentLock).save(lock);
      }
      this.metric(target.toLowerCase());
      this.log(target.toLowerCase(), deployment, actor);
      return this.view(manager, deployment);
    });
  }

  async progress(
    deploymentId: string,
    input: DeploymentProgressRequest,
    actor: DeploymentActor,
  ): Promise<DeploymentView> {
    this.ensureEnabled();
    this.ensurePermission(actor, 'progress');
    if (
      !Number.isInteger(input.percent) ||
      input.percent < 0 ||
      input.percent > 100
    )
      throw new ConflictException('Progress must be between 0 and 100.');
    return this.transaction(async (manager) => {
      const deployment = await this.getDeployment(manager, deploymentId);
      const repo = manager.getRepository(ThemeDeploymentProgressEvent);
      const duplicate = await repo.findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (!duplicate)
        await repo.insert({
          deploymentId,
          idempotencyKey: input.idempotencyKey,
          percent: input.percent,
          message: input.message ?? null,
        });
      this.metric('progress');
      return this.view(manager, deployment);
    });
  }

  async health(
    deploymentId: string,
    status: 'PASSED' | 'FAILED' | 'PENDING',
    details: Record<string, unknown>,
    actor: DeploymentActor,
  ): Promise<void> {
    this.ensureEnabled();
    this.ensurePermission(actor, 'health');
    await this.transaction(async (manager) => {
      await this.getDeployment(manager, deploymentId);
      await manager.getRepository(ThemeDeploymentHealthCheck).insert({
        deploymentId,
        status,
        latencyMs:
          typeof details.latencyMs === 'number' ? details.latencyMs : null,
        details,
      } as never);
      this.metric(`health_${status.toLowerCase()}`);
    });
  }

  async get(deploymentId: string): Promise<DeploymentView> {
    this.ensureEnabled();
    return this.view(
      this.dataSource.manager,
      await this.getDeployment(this.dataSource.manager, deploymentId),
    );
  }

  async timeline(deploymentId: string): Promise<ThemeDeploymentEvent[]> {
    this.ensureEnabled();
    await this.getDeployment(this.dataSource.manager, deploymentId);
    return this.dataSource
      .getRepository(ThemeDeploymentEvent)
      .find({ where: { deploymentId }, order: { sequence: 'ASC' } });
  }

  async snapshots(deploymentId: string): Promise<ThemeDeploymentSnapshot> {
    this.ensureEnabled();
    await this.getDeployment(this.dataSource.manager, deploymentId);
    const snapshot = await this.dataSource
      .getRepository(ThemeDeploymentSnapshot)
      .findOne({ where: { deploymentId } });
    if (!snapshot)
      throw new NotFoundException('Deployment snapshot was not found.');
    return snapshot;
  }

  metricsSnapshot(): Record<string, number> {
    this.ensureEnabled();
    if (!readThemeMigrationFlags(this.config).deploymentMetricsEnabled)
      return {};
    return this.metrics.snapshot();
  }

  private validateDependencies(
    candidate: ThemeReleaseCandidate,
    channel: DeploymentChannel,
  ): Record<string, unknown> & { valid: boolean; dependencies: unknown[] } {
    const raw = (candidate.releaseMetadataJson as { dependencies?: unknown })
      .dependencies;
    const dependencies = Array.isArray(raw) ? raw : [];
    const errors: string[] = [];
    const seen = new Set<string>();
    for (const dependency of dependencies) {
      const key =
        typeof dependency === 'string'
          ? dependency
          : JSON.stringify(dependency);
      if (seen.has(key)) errors.push(`Duplicate dependency ${key}.`);
      seen.add(key);
      const dependencyName =
        typeof dependency === 'object' && dependency !== null
          ? String(
              (dependency as { name?: unknown; id?: unknown }).name ??
                (dependency as { id?: unknown }).id ??
                '',
            )
          : key;
      if (
        !key ||
        dependencyName === candidate.familySlug ||
        key === candidate.version
      )
        errors.push(`Invalid or self-referencing dependency ${key}.`);
    }
    if (channel !== 'COMBINED' && candidate.channel !== channel)
      errors.push('Release channel is incompatible with deployment channel.');
    return { valid: errors.length === 0, dependencies, errors };
  }

  private async view(
    manager: EntityManager,
    deployment: ThemeEnterpriseDeployment,
  ): Promise<DeploymentView> {
    const latest = await manager.getRepository(ThemeDeploymentEvent).findOne({
      where: { deploymentId: deployment.id },
      order: { sequence: 'DESC' },
    });
    const snapshot = await manager
      .getRepository(ThemeDeploymentSnapshot)
      .findOne({ where: { deploymentId: deployment.id } });
    if (!latest || !snapshot)
      throw new ConflictException('Deployment projection is incomplete.');
    return {
      id: deployment.id,
      tenantId: deployment.tenantId,
      channel: deployment.channel,
      environment: deployment.environment,
      releaseCandidateId: deployment.releaseCandidateId,
      snapshotId: deployment.snapshotId,
      state: latest.toState,
      sequence: latest.sequence,
      snapshotHash: snapshot.snapshotHash,
      dependencyReport: deployment.dependencyReport,
      versionGraph: deployment.versionGraph,
    };
  }

  private async getDeployment(
    manager: EntityManager,
    id: string,
  ): Promise<ThemeEnterpriseDeployment> {
    const deployment = await manager
      .getRepository(ThemeEnterpriseDeployment)
      .findOne({ where: { id } });
    if (!deployment) throw new NotFoundException('Deployment was not found.');
    return deployment;
  }

  private async transaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      const value = await work(runner.manager);
      await runner.commitTransaction();
      return value;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async advisoryLock(
    manager: EntityManager,
    scope: string,
  ): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [scope]);
  }

  private scope(
    tenantId: string,
    channel: string,
    environment: string,
  ): string {
    return `theme-deployment:${tenantId}:${channel}:${environment}`;
  }
  private leaseMs(): number {
    return (
      this.config.get<number>('themeDeploymentEngine.lockLeaseSeconds', 300) *
      1000
    );
  }
  private metric(name: string): void {
    if (readThemeMigrationFlags(this.config).deploymentMetricsEnabled)
      this.metrics.increment(name);
  }
  private ensureEnabled(): void {
    if (!readThemeMigrationFlags(this.config).deploymentEngineEnabled)
      throw new NotFoundException('Deployment engine is disabled.');
  }
  private ensurePermission(actor: DeploymentActor, action: string): void {
    if (![UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT].includes(actor.role))
      throw new ForbiddenException(`Role cannot perform deployment ${action}.`);
  }
  private log(
    action: string,
    deployment: ThemeEnterpriseDeployment,
    actor: DeploymentActor,
  ): void {
    writeThemeMigrationLog({
      event: `theme.deployment.${action}.completed`,
      phase: 'phase-5',
      implementation: 'deployment-engine',
      channel: deployment.channel,
      mode: deployment.environment,
      metadata: {
        deploymentId: deployment.id,
        tenantId: deployment.tenantId,
        actorUserId: actor.userId,
        runtimeActivated: false,
      },
    });
  }
}
