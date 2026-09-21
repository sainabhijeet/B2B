import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { readThemeMigrationFlags } from '../../common/observability/theme-migration-flags';
import { writeThemeMigrationLog } from '../../common/observability/theme-migration-log';
import {
  ThemeReleaseCandidate,
  ThemeReleaseCandidateStatus,
} from './entities/theme-release-candidate.entity';
import { ThemeReleaseLifecycleEvent } from './entities/theme-release-lifecycle-event.entity';
import { ThemeReleaseReviewer } from './entities/theme-release-reviewer.entity';
import { ThemeReleaseReviewComment } from './entities/theme-release-review-comment.entity';
import { ThemeReleaseApprovalHistory } from './entities/theme-release-approval-history.entity';
import { ThemeReleaseLifecycleMetricsService } from './theme-release-lifecycle-metrics.service';
import { EnterpriseAuditService } from '../../common/observability/enterprise-audit.service';
import { translationCoverageBlockers } from './validation/translation.validator';

export type LifecycleActor = { userId: string | null; role: UserRole };
export type LifecycleRequest = {
  candidateId: string;
  idempotencyKey: string;
  expectedRevision: number;
  actor: LifecycleActor;
  comment?: string;
  metadata?: Record<string, unknown>;
};

const platformRoles = new Set([
  UserRole.SUPER_ADMIN,
  UserRole.PLATFORM_SUPPORT,
]);
const transitions: Record<string, ThemeReleaseCandidateStatus[]> = {
  DRAFT: ['IN_REVIEW' as ThemeReleaseCandidateStatus],
  IN_REVIEW: ['DRAFT', 'APPROVAL_READY', 'REJECTED'],
  APPROVAL_READY: ['DRAFT', 'APPROVED', 'REJECTED'],
  APPROVED: ['PUBLISHED'],
  PUBLISHED: ['DEPRECATED', 'ARCHIVED'],
  DEPRECATED: ['ARCHIVED'],
  REJECTED: ['DRAFT'],
  QUARANTINED: ['DRAFT'],
};

@Injectable()
export class ThemeReleaseLifecycleService {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly metrics: ThemeReleaseLifecycleMetricsService,
    private readonly audit: EnterpriseAuditService,
  ) {}

  async transition(
    request: LifecycleRequest,
    action: string,
    toStatus: ThemeReleaseCandidateStatus,
  ): Promise<ThemeReleaseCandidate> {
    this.ensureEnabled();
    this.ensurePermission(action, request.actor);
    return this.runAction(request, action, toStatus, (candidate) => {
      if (!transitions[candidate.status]?.includes(toStatus)) {
        throw new ConflictException(
          `Cannot ${action} a release in ${candidate.status} status.`,
        );
      }
      if (action === 'publish' && candidate.status !== 'APPROVED') {
        throw new ConflictException('Only approved releases can be published.');
      }
      if (action === 'publish') {
        const flags = readThemeMigrationFlags(this.configService);
        const coverage = (
          candidate.validationReportJson as {
            translationCoverage?: Record<string, unknown>;
          }
        ).translationCoverage;
        const blockers = flags.languagePublishBlocking
          ? translationCoverageBlockers(coverage)
          : [];
        if (blockers.length)
          throw new ConflictException(
            `Release cannot be published until localization is production-ready: ${blockers.join(', ')}.`,
          );
      }
    });
  }

  async editDraft(
    request: LifecycleRequest,
    changes: {
      releaseNotes?: string;
      changelog?: Array<Record<string, unknown>>;
    },
  ): Promise<ThemeReleaseCandidate> {
    this.ensureEnabled();
    this.ensurePermission('edit-draft', request.actor);
    return this.runAction(request, 'edit-draft', 'DRAFT', (candidate) => {
      if (candidate.status !== 'DRAFT')
        throw new ConflictException('Only drafts can be edited.');
      if (changes.releaseNotes !== undefined)
        candidate.releaseNotes = changes.releaseNotes;
      if (changes.changelog !== undefined)
        candidate.changelog = changes.changelog;
    });
  }

  async assignReviewer(
    request: LifecycleRequest,
    reviewerUserId: string,
  ): Promise<ThemeReleaseReviewer> {
    this.ensureEnabled();
    this.ensurePermission('assign-reviewer', request.actor);
    return this.withTransaction(async (manager) => {
      const candidate = await this.getCandidate(manager, request.candidateId);
      await this.assertRevision(candidate, request.expectedRevision);
      const repo = manager.getRepository(ThemeReleaseReviewer);
      const existing = await repo.findOne({
        where: { candidateId: candidate.id, reviewerUserId },
      });
      if (existing) return existing;
      const assignment = await repo.save(
        repo.create({
          candidateId: candidate.id,
          reviewerUserId,
          status: 'ASSIGNED',
          assignedByUserId: request.actor.userId,
        }),
      );
      await this.bumpRevision(manager, candidate);
      await this.recordEvent(
        manager,
        request,
        'assign-reviewer',
        candidate,
        candidate.status,
        {
          reviewerUserId,
        },
      );
      return assignment;
    });
  }

  async addComment(
    request: LifecycleRequest,
    body: string,
  ): Promise<ThemeReleaseReviewComment> {
    this.ensureEnabled();
    this.ensurePermission('comment', request.actor);
    if (!body.trim())
      throw new ConflictException('Review comment cannot be empty.');
    return this.withTransaction(async (manager) => {
      const candidate = await this.getCandidate(manager, request.candidateId);
      await this.assertRevision(candidate, request.expectedRevision);
      const comment = await manager
        .getRepository(ThemeReleaseReviewComment)
        .save({
          candidateId: candidate.id,
          authorUserId: request.actor.userId,
          body,
          status: 'OPEN',
          resolvedByUserId: null,
          resolvedAt: null,
        });
      await this.bumpRevision(manager, candidate);
      await this.recordEvent(
        manager,
        request,
        'comment',
        candidate,
        candidate.status,
        { commentId: comment.id },
      );
      return comment;
    });
  }

  async addRollbackMetadata(
    request: LifecycleRequest,
    metadata: Record<string, unknown>,
  ): Promise<ThemeReleaseCandidate> {
    this.ensureEnabled();
    this.ensurePermission('rollback-metadata', request.actor);
    return this.runAction(
      request,
      'rollback-metadata',
      undefined,
      (candidate) => {
        if (
          !['APPROVED', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED'].includes(
            candidate.status,
          )
        ) {
          throw new ConflictException(
            'Rollback metadata requires an approved or later release.',
          );
        }
        candidate.rollbackMetadata = {
          ...candidate.rollbackMetadata,
          ...metadata,
        };
      },
    );
  }

  async timeline(candidateId: string): Promise<ThemeReleaseLifecycleEvent[]> {
    this.ensureEnabled();
    return this.dataSource.getRepository(ThemeReleaseLifecycleEvent).find({
      where: { candidateId },
      order: { createdAt: 'ASC' },
    });
  }

  async comparison(
    candidateId: string,
    otherCandidateId: string,
  ): Promise<Record<string, unknown>> {
    this.ensureEnabled();
    const repo = this.dataSource.getRepository(ThemeReleaseCandidate);
    const [left, right] = await Promise.all([
      repo.findOne({ where: { id: candidateId } }),
      repo.findOne({ where: { id: otherCandidateId } }),
    ]);
    if (!left || !right)
      throw new NotFoundException('Release candidate was not found.');
    return {
      left: {
        id: left.id,
        version: left.version,
        status: left.status,
        manifest: left.manifestJson,
        packageSha256: left.packageSha256,
      },
      right: {
        id: right.id,
        version: right.version,
        status: right.status,
        manifest: right.manifestJson,
        packageSha256: right.packageSha256,
      },
      changes: {
        versionChanged: left.version !== right.version,
        manifestChanged:
          JSON.stringify(left.manifestJson) !==
          JSON.stringify(right.manifestJson),
        packageChanged: left.packageSha256 !== right.packageSha256,
      },
    };
  }

  metricsSnapshot(): Record<string, number> {
    this.ensureEnabled();
    if (!readThemeMigrationFlags(this.configService).lifecycleMetricsEnabled)
      return {};
    return this.metrics.snapshot();
  }

  private async runAction(
    request: LifecycleRequest,
    action: string,
    toStatus: ThemeReleaseCandidateStatus | undefined,
    validate: (candidate: ThemeReleaseCandidate) => void,
  ): Promise<ThemeReleaseCandidate> {
    return this.withTransaction(async (manager) => {
      const eventRepo = manager.getRepository(ThemeReleaseLifecycleEvent);
      const existingEvent = await eventRepo.findOne({
        where: {
          candidateId: request.candidateId,
          idempotencyKey: request.idempotencyKey,
        },
      });
      if (existingEvent) return this.getCandidate(manager, request.candidateId);
      const candidate = await this.getCandidate(manager, request.candidateId);
      await this.assertRevision(candidate, request.expectedRevision);
      validate(candidate);
      const fromStatus = candidate.status;
      if (toStatus) candidate.status = toStatus;
      await this.updateCandidate(manager, candidate, request.expectedRevision);
      await this.recordEvent(
        manager,
        request,
        action,
        candidate,
        fromStatus,
        request.metadata,
      );
      if (action === 'approve' || action === 'reject') {
        await manager.getRepository(ThemeReleaseApprovalHistory).save({
          candidateId: candidate.id,
          decision: action === 'approve' ? 'APPROVED' : 'REJECTED',
          actorUserId: request.actor.userId,
          actorRole: request.actor.role,
          reason: request.comment ?? null,
          metadata: request.metadata ?? {},
        });
      }
      if (readThemeMigrationFlags(this.configService).lifecycleMetricsEnabled) {
        this.metrics.increment(action);
      }
      return candidate;
    });
  }

  private async recordEvent(
    manager: ReturnType<DataSource['createQueryRunner']>['manager'],
    request: LifecycleRequest,
    action: string,
    candidate: ThemeReleaseCandidate,
    fromStatus: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await manager.getRepository(ThemeReleaseLifecycleEvent).insert({
      candidateId: candidate.id,
      idempotencyKey: request.idempotencyKey,
      action,
      fromStatus,
      toStatus: candidate.status,
      actorUserId: request.actor.userId,
      actorRole: request.actor.role,
      comment: request.comment ?? null,
      metadata: metadata ?? {},
    } as never);
    await this.audit.record(
      {
        domain: 'theme.release',
        action,
        outcome: 'completed',
        resourceType: 'theme_release_candidate',
        resourceId: candidate.id,
        tenantId: null,
        actorUserId: request.actor.userId,
        requestId: request.idempotencyKey,
        correlationId: request.idempotencyKey,
        metadata: {
          fromStatus,
          toStatus: candidate.status,
          ...(metadata ?? {}),
        },
      },
      manager,
    );
    writeThemeMigrationLog({
      event: `theme.release.lifecycle.${action}.completed`,
      phase: 'phase-3',
      implementation: 'release-validation-pipeline',
      channel: candidate.channel,
      mode: candidate.status,
      metadata: {
        candidateId: candidate.id,
        fromStatus,
        toStatus: candidate.status,
      },
    });
  }

  private async withTransaction<T>(
    work: (
      manager: ReturnType<DataSource['createQueryRunner']>['manager'],
    ) => Promise<T>,
  ): Promise<T> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      const result = await work(runner.manager);
      await runner.commitTransaction();
      return result;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async getCandidate(
    manager: ReturnType<DataSource['createQueryRunner']>['manager'],
    id: string,
  ): Promise<ThemeReleaseCandidate> {
    const candidate = await manager
      .getRepository(ThemeReleaseCandidate)
      .findOne({ where: { id } });
    if (!candidate)
      throw new NotFoundException('Release candidate was not found.');
    return candidate;
  }

  private async assertRevision(
    candidate: ThemeReleaseCandidate,
    expectedRevision: number,
  ): Promise<void> {
    if (
      !Number.isInteger(expectedRevision) ||
      candidate.lifecycleRevision !== expectedRevision
    ) {
      throw new ConflictException('Release lifecycle revision is stale.');
    }
  }

  private async updateCandidate(
    manager: ReturnType<DataSource['createQueryRunner']>['manager'],
    candidate: ThemeReleaseCandidate,
    expectedRevision: number,
  ): Promise<void> {
    const result = await manager
      .getRepository(ThemeReleaseCandidate)
      .createQueryBuilder()
      .update(ThemeReleaseCandidate)
      .set({
        status: candidate.status,
        releaseNotes: candidate.releaseNotes,
        changelog: candidate.changelog,
        rollbackMetadata: candidate.rollbackMetadata,
        lifecycleRevision: () => 'lifecycle_revision + 1',
      } as never)
      .where('id = :id AND lifecycle_revision = :revision', {
        id: candidate.id,
        revision: expectedRevision,
      })
      .execute();
    if (result.affected !== 1)
      throw new ConflictException('Release lifecycle revision is stale.');
    candidate.lifecycleRevision = expectedRevision + 1;
  }

  private async bumpRevision(
    manager: ReturnType<DataSource['createQueryRunner']>['manager'],
    candidate: ThemeReleaseCandidate,
  ): Promise<void> {
    const result = await manager
      .getRepository(ThemeReleaseCandidate)
      .createQueryBuilder()
      .update(ThemeReleaseCandidate)
      .set({ lifecycleRevision: () => 'lifecycle_revision + 1' })
      .where('id = :id AND lifecycle_revision = :revision', {
        id: candidate.id,
        revision: candidate.lifecycleRevision,
      })
      .execute();
    if (result.affected !== 1)
      throw new ConflictException('Release lifecycle revision is stale.');
    candidate.lifecycleRevision += 1;
  }

  private ensureEnabled(): void {
    if (!readThemeMigrationFlags(this.configService).lifecycleEnabled)
      throw new NotFoundException('Theme lifecycle is disabled.');
  }

  private ensurePermission(action: string, actor: LifecycleActor): void {
    if (!platformRoles.has(actor.role))
      throw new ForbiddenException(`Role cannot perform ${action}.`);
    if (action === 'publish' && actor.role !== UserRole.SUPER_ADMIN)
      throw new ForbiddenException('Only SUPER_ADMIN can publish releases.');
  }
}
