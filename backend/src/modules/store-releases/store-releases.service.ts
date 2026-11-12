import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersion } from '../../common/entities/app-version.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';
import { BuildArtifact } from '../../common/entities/build-artifact.entity';
import { BuildJob } from '../../common/entities/build-job.entity';
import type { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CreateStoreReleaseDto } from './dto/create-store-release.dto';
import { UpdateStoreReleaseStatusDto } from './dto/update-store-release-status.dto';
import { UpsertStoreReleaseSettingsDto } from './dto/upsert-store-release-settings.dto';
import { StoreRelease, StoreReleaseStatus } from './store-release.entity';
import { StoreReleaseEvent } from './store-release-event.entity';
import { StoreReleaseSettings } from './store-release-settings.entity';

const TERMINAL_STATUSES: StoreReleaseStatus[] = [
  'SUBMITTED',
  'LIVE',
  'FAILED',
  'CANCELLED',
  'ROLLED_BACK',
];

@Injectable()
export class StoreReleasesService {
  constructor(
    @InjectRepository(StoreRelease)
    private readonly releases: Repository<StoreRelease>,
    @InjectRepository(StoreReleaseEvent)
    private readonly events: Repository<StoreReleaseEvent>,
    @InjectRepository(StoreReleaseSettings)
    private readonly settings: Repository<StoreReleaseSettings>,
    @InjectRepository(BuildArtifact)
    private readonly artifacts: Repository<BuildArtifact>,
    @InjectRepository(BuildJob)
    private readonly buildJobs: Repository<BuildJob>,
    @InjectRepository(AppVersion)
    private readonly appVersions: Repository<AppVersion>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  async listSettings(tenantId: string) {
    const rows = await this.settings.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.sanitizeSettings(row));
  }

  async upsertSettings(
    tenantId: string,
    actor: JwtUserPayload,
    dto: UpsertStoreReleaseSettingsDto,
  ) {
    let row = await this.settings.findOne({
      where: {
        tenantId,
        platform: dto.platform,
        packageNameOrBundleId: dto.packageNameOrBundleId,
      },
    });
    if (!row) {
      row = this.settings.create({
        tenantId,
        platform: dto.platform,
        packageNameOrBundleId: dto.packageNameOrBundleId,
        createdBy: actor.sub,
        updatedBy: actor.sub,
        encryptedCredentials: null,
        credentialStatus: 'NOT_CONFIGURED',
        releaseTrack: dto.releaseTrack ?? null,
      });
    } else {
      row.releaseTrack = dto.releaseTrack ?? null;
      row.updatedBy = actor.sub;
    }
    const saved = await this.settings.save(row);
    await this.audit(tenantId, actor.sub, 'store_release.settings.upsert', {
      platform: saved.platform,
      packageNameOrBundleId: saved.packageNameOrBundleId,
    });
    return this.sanitizeSettings(saved);
  }

  async listEligibleArtifacts(tenantId: string) {
    const artifacts = await this.artifacts
      .createQueryBuilder('artifact')
      .innerJoin(BuildJob, 'job', 'job.id = artifact.build_job_id')
      .where('job.tenant_id = :tenantId', { tenantId })
      .andWhere('job.status = :status', { status: 'SUCCESS' })
      .andWhere('artifact.artifact_type IN (:...types)', {
        types: ['APK', 'AAB'],
      })
      .orderBy('artifact.created_at', 'DESC')
      .limit(50)
      .getMany();
    return artifacts.map((artifact) => ({
      id: artifact.id,
      artifactType: artifact.artifactType,
      versionCode: artifact.versionCode,
      versionName: artifact.versionName,
      fileSize: artifact.fileSize,
      createdAt: artifact.createdAt,
    }));
  }

  async listReleases(tenantId: string) {
    const rows = await this.releases.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.sanitizeRelease(row));
  }

  async getRelease(tenantId: string, releaseId: string) {
    const release = await this.findReleaseForTenant(tenantId, releaseId);
    const events = await this.events.find({
      where: { tenantId, releaseId },
      order: { createdAt: 'ASC' },
    });
    return { ...this.sanitizeRelease(release), events };
  }

  async createRelease(
    tenantId: string,
    actor: JwtUserPayload,
    dto: CreateStoreReleaseDto,
  ) {
    const artifact = await this.artifacts.findOne({
      where: { id: dto.buildArtifactId },
    });
    if (!artifact) throw new NotFoundException('Build artifact not found.');
    const job = await this.buildJobs.findOne({
      where: { id: artifact.buildJobId },
    });
    if (!job || job.tenantId !== tenantId) {
      throw new ForbiddenException(
        'Build artifact does not belong to this tenant.',
      );
    }
    if (job.status !== 'SUCCESS') {
      throw new BadRequestException(
        'Only successful build artifacts can be released.',
      );
    }
    if (!['APK', 'AAB'].includes(artifact.artifactType)) {
      throw new BadRequestException(
        'Only mobile build artifacts can be released.',
      );
    }
    if (
      dto.platform === 'ANDROID' &&
      !['APK', 'AAB'].includes(artifact.artifactType)
    ) {
      throw new BadRequestException(
        'Android releases require APK or AAB artifacts.',
      );
    }
    if (dto.platform === 'IOS') {
      throw new BadRequestException(
        'iOS store releases require an approved iOS build artifact workflow.',
      );
    }

    const appVersion = await this.appVersions.findOne({
      where: { artifactId: artifact.id },
      order: { createdAt: 'DESC' },
    });
    const release = await this.releases.save(
      this.releases.create({
        tenantId,
        buildArtifactId: artifact.id,
        appVersionId: appVersion?.id ?? null,
        platform: dto.platform,
        storeProvider: dto.storeProvider,
        track: dto.track ?? null,
        versionName: artifact.versionName,
        versionCode: artifact.versionCode,
        status: 'DRAFT',
        submittedBy: actor.sub,
      }),
    );
    await this.recordEvent(release, 'CREATED', null, 'DRAFT', actor.sub, {
      buildArtifactId: artifact.id,
    });
    await this.audit(tenantId, actor.sub, 'store_release.created', {
      releaseId: release.id,
    });
    return this.sanitizeRelease(release);
  }

  async updateStatus(
    tenantId: string,
    actor: JwtUserPayload,
    releaseId: string,
    dto: UpdateStoreReleaseStatusDto,
  ) {
    const release = await this.findReleaseForTenant(tenantId, releaseId);
    if (TERMINAL_STATUSES.includes(release.status)) {
      throw new BadRequestException('Terminal releases cannot be updated.');
    }
    const from = release.status;
    if (dto.status === 'QUEUED') {
      if (from !== 'DRAFT' && from !== 'FAILED') {
        throw new BadRequestException(
          'Only draft or failed releases can be queued.',
        );
      }
      release.status = 'QUEUED';
      release.submittedAt = new Date();
    } else if (dto.status === 'CANCELLED') {
      if (
        from === 'SUBMITTING' ||
        from === 'SUBMITTED' ||
        from === 'IN_REVIEW'
      ) {
        throw new BadRequestException(
          'Submitted releases cannot be cancelled locally.',
        );
      }
      release.status = 'CANCELLED';
      release.completedAt = new Date();
    }
    const saved = await this.releases.save(release);
    await this.recordEvent(
      saved,
      'STATUS_CHANGED',
      from,
      saved.status,
      actor.sub,
      {},
    );
    await this.audit(tenantId, actor.sub, 'store_release.status_changed', {
      releaseId: saved.id,
      from,
      to: saved.status,
    });
    return this.sanitizeRelease(saved);
  }

  private async findReleaseForTenant(tenantId: string, releaseId: string) {
    const release = await this.releases.findOne({
      where: { id: releaseId, tenantId },
    });
    if (!release) throw new NotFoundException('Store release not found.');
    return release;
  }

  private sanitizeRelease(release: StoreRelease) {
    return {
      id: release.id,
      tenantId: release.tenantId,
      buildArtifactId: release.buildArtifactId,
      appVersionId: release.appVersionId,
      platform: release.platform,
      storeProvider: release.storeProvider,
      track: release.track,
      versionName: release.versionName,
      versionCode: release.versionCode,
      status: release.status,
      externalReleaseId: release.externalReleaseId,
      lastErrorCode: release.lastErrorCode,
      lastErrorMessage: release.lastErrorMessage,
      submittedAt: release.submittedAt,
      completedAt: release.completedAt,
      createdAt: release.createdAt,
      updatedAt: release.updatedAt,
    };
  }

  private sanitizeSettings(row: StoreReleaseSettings) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      platform: row.platform,
      packageNameOrBundleId: row.packageNameOrBundleId,
      releaseTrack: row.releaseTrack,
      credentialStatus: row.credentialStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async recordEvent(
    release: StoreRelease,
    eventType: string,
    fromStatus: string | null,
    toStatus: string | null,
    actorUserId: string | null,
    metadata: Record<string, unknown>,
  ) {
    await this.events.save(
      this.events.create({
        releaseId: release.id,
        tenantId: release.tenantId,
        eventType,
        fromStatus,
        toStatus,
        actorUserId,
        metadata,
      }),
    );
  }

  private async audit(
    tenantId: string,
    actorUserId: string | null,
    action: string,
    metadata: Record<string, unknown>,
  ) {
    await this.auditLogs.save(
      this.auditLogs.create({ tenantId, actorUserId, action, metadata }),
    );
  }
}
