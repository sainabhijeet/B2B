import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import { basename, isAbsolute, join, resolve } from 'path';
import { QueryFailedError, Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BuildArtifact } from '../../common/entities/build-artifact.entity';
import { BuildJob } from '../../common/entities/build-job.entity';
import { MobileRelease, MobileReleasePlatform, MobileReleaseStatus } from '../../common/entities/mobile-release.entity';
import { MobileReleaseEvent } from '../../common/entities/mobile-release-event.entity';
import { MobileReleaseSettings } from '../../common/entities/mobile-release-settings.entity';
import { Theme } from '../../common/entities/theme.entity';
import { PLATFORM_ROLES, UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import {
  collectExpectedMobileLocalizationAssets,
  validateMobileLocalizationAssetsInArtifact,
} from '../../build-system/mobile-localization-assets';
import { PutMobileReleaseSettingsDto } from './dto/mobile-release-settings.dto';
import { UploadAppStoreDto, UploadGooglePlayDto } from './dto/release-action.dto';
import { MobileReleaseCryptoService } from './mobile-release-crypto.service';
import { MobileReleaseProviderService } from './mobile-release-provider.service';

const UPLOAD_ROLES = new Set<UserRole>([UserRole.SUPER_ADMIN, UserRole.PLATFORM_SUPPORT, UserRole.OWNER]);

@Injectable()
export class MobileReleaseService {
  constructor(
    @InjectRepository(MobileReleaseSettings)
    private readonly settingsRepo: Repository<MobileReleaseSettings>,
    @InjectRepository(MobileRelease)
    private readonly releasesRepo: Repository<MobileRelease>,
    @InjectRepository(MobileReleaseEvent)
    private readonly eventsRepo: Repository<MobileReleaseEvent>,
    @InjectRepository(BuildArtifact)
    private readonly artifactsRepo: Repository<BuildArtifact>,
    @InjectRepository(BuildJob)
    private readonly buildJobsRepo: Repository<BuildJob>,
    @InjectRepository(Theme)
    private readonly themesRepo: Repository<Theme>,
    private readonly crypto: MobileReleaseCryptoService,
    private readonly providers: MobileReleaseProviderService,
    private readonly audit: AuditLogsService,
  ) {}

  async getSettings(user: JwtUserPayload, tenantId?: string) {
    const resolvedTenantId = this.resolveTenantId(user, tenantId);
    const settings = await this.settingsRepo.findOne({ where: { tenantId: resolvedTenantId } }).catch((error) => {
      if (isMissingRelation(error)) return null;
      throw error;
    });
    return {
      google: {
        packageName: settings?.googlePackageName ?? '',
        hasServiceAccountJson: !!settings?.googleServiceAccountJsonEncrypted,
        defaultTrack: settings?.googleDefaultTrack ?? 'internal',
        releaseNotesTemplate: settings?.googleReleaseNotesTemplate ?? '',
      },
      apple: {
        bundleIdentifier: settings?.appleBundleIdentifier ?? '',
        issuerId: settings?.appleIssuerId ?? '',
        keyId: settings?.appleKeyId ?? '',
        hasApiKey: !!settings?.appleApiKeyEncrypted,
        teamId: settings?.appleTeamId ?? '',
      },
    };
  }

  async putSettings(user: JwtUserPayload, dto: PutMobileReleaseSettingsDto, tenantId?: string) {
    this.ensureUploader(user);
    const resolvedTenantId = this.resolveTenantId(user, tenantId);
    const settings =
      (await this.settingsRepo.findOne({ where: { tenantId: resolvedTenantId } })) ??
      this.settingsRepo.create({ tenantId: resolvedTenantId });

    settings.googlePackageName = clean(dto.googlePackageName, settings.googlePackageName);
    settings.googleDefaultTrack = dto.googleDefaultTrack ?? settings.googleDefaultTrack ?? 'internal';
    settings.googleReleaseNotesTemplate = clean(dto.googleReleaseNotesTemplate, settings.googleReleaseNotesTemplate);
    settings.appleBundleIdentifier = clean(dto.appleBundleIdentifier, settings.appleBundleIdentifier);
    settings.appleIssuerId = clean(dto.appleIssuerId, settings.appleIssuerId);
    settings.appleKeyId = clean(dto.appleKeyId, settings.appleKeyId);
    settings.appleTeamId = clean(dto.appleTeamId, settings.appleTeamId);
    if (dto.googleServiceAccountJson?.trim()) {
      settings.googleServiceAccountJsonEncrypted = this.crypto.encrypt(dto.googleServiceAccountJson);
    }
    if (dto.appleApiKey?.trim()) {
      settings.appleApiKeyEncrypted = this.crypto.encrypt(dto.appleApiKey);
    }
    await this.settingsRepo.save(settings);
    await this.audit.log({
      action: 'mobile_release.settings.updated',
      tenantId: resolvedTenantId,
      actorUserId: user.sub,
      metadata: { googleConfigured: !!settings.googleServiceAccountJsonEncrypted, appleConfigured: !!settings.appleApiKeyEncrypted },
    });
    return this.getSettings(user, resolvedTenantId);
  }

  async listReleases(user: JwtUserPayload, tenantId?: string) {
    const resolvedTenantId = this.resolveTenantId(user, tenantId);
    const releases = await this.releasesRepo
      .find({
        where: { tenantId: resolvedTenantId },
        order: { createdAt: 'DESC' },
        take: 100,
      })
      .catch((error) => {
        if (isMissingRelation(error)) return [];
        throw error;
      });
    return releases.map((release) => this.toDto(release));
  }

  async getRelease(user: JwtUserPayload, releaseId: string) {
    const release = await this.releasesRepo.findOne({ where: { id: releaseId } });
    if (!release) throw new NotFoundException('Release not found.');
    this.ensureTenantAccess(user, release.tenantId);
    const events = await this.eventsRepo.find({ where: { releaseId }, order: { createdAt: 'ASC' } });
    return { ...this.toDto(release), events };
  }

  async uploadGooglePlay(user: JwtUserPayload, dto: UploadGooglePlayDto, ipAddress?: string) {
    this.ensureUploader(user);
    const tenantId = this.resolveTenantId(user);
    const settings = await this.requiredSettings(tenantId);
    const serviceAccountJson = this.crypto.decrypt(settings.googleServiceAccountJsonEncrypted);
    if (!serviceAccountJson) throw new BadRequestException('Missing Credentials');
    if (!settings.googlePackageName) throw new BadRequestException('Package Name Mismatch');
    const artifact = await this.resolveArtifact(tenantId, 'AAB', dto.artifactId);
    if (artifact.job.packageName !== settings.googlePackageName) throw new BadRequestException('Package Name Mismatch');
    const release = await this.createRelease(tenantId, user.sub, 'GOOGLE_PLAY', artifact, {
      track: dto.track ?? settings.googleDefaultTrack,
      notes: dto.releaseNotes ?? settings.googleReleaseNotesTemplate ?? null,
      ipAddress,
    });
    const startedAt = Date.now();
    try {
      await this.event(release, 'Uploading', 35, 'Uploading AAB to Google Play');
      await this.event(release, 'Uploading', 35, '[BUILD] Uploading artifact...');
      const result = await this.providers.uploadGooglePlay({
        serviceAccountJson,
        packageName: settings.googlePackageName,
        artifactPath: artifact.absolutePath,
        track: release.releaseTrack ?? 'internal',
        versionCode: release.buildNumber,
        releaseNotes: release.releaseNotes,
      });
      release.googleReleaseId = result.releaseId;
      release.status = 'PUBLISHED';
      release.progress = 100;
      release.uploadDate = new Date();
      release.durationMs = Date.now() - startedAt;
      release.metadata = { ...(release.metadata ?? {}), editId: result.editId };
      await this.releasesRepo.save(release);
      await this.event(release, 'Published', 100, 'Google Play release published');
      await this.logReleaseAction('mobile_release.google.published', release, user, ipAddress, 'success');
      return this.toDto(release);
    } catch (error) {
      await this.failRelease(release, error, startedAt);
      await this.logReleaseAction('mobile_release.google.failed', release, user, ipAddress, 'failed');
      throw error;
    }
  }

  async uploadAppStore(user: JwtUserPayload, dto: UploadAppStoreDto, ipAddress?: string) {
    this.ensureUploader(user);
    const tenantId = this.resolveTenantId(user);
    const settings = await this.requiredSettings(tenantId);
    const apiKey = this.crypto.decrypt(settings.appleApiKeyEncrypted);
    if (!apiKey || !settings.appleIssuerId || !settings.appleKeyId) throw new BadRequestException('Missing Credentials');
    if (!settings.appleBundleIdentifier) throw new BadRequestException('Package Name Mismatch');
    const artifact = await this.resolveArtifact(tenantId, 'IPA', dto.artifactId);
    const release = await this.createRelease(tenantId, user.sub, 'APP_STORE', artifact, {
      track: 'testflight',
      notes: dto.releaseNotes ?? null,
      ipAddress,
      packageName: settings.appleBundleIdentifier,
    });
    const startedAt = Date.now();
    try {
      await this.event(release, 'Uploading IPA', 35, 'Uploading IPA to App Store Connect');
      await this.event(release, 'Uploading IPA', 35, '[BUILD] Uploading artifact...');
      const result = await this.providers.uploadAppStore({
        issuerId: settings.appleIssuerId,
        keyId: settings.appleKeyId,
        apiKey,
        bundleIdentifier: settings.appleBundleIdentifier,
        teamId: settings.appleTeamId,
        artifactPath: artifact.absolutePath,
        versionName: release.versionName,
        buildNumber: release.buildNumber,
      });
      release.appleBuildId = result.buildId;
      release.status = 'PROCESSING';
      release.progress = 80;
      release.processingStatus = result.processingStatus;
      release.uploadDate = new Date();
      release.durationMs = Date.now() - startedAt;
      await this.releasesRepo.save(release);
      await this.event(release, 'Apple Processing', 80, 'Apple is processing the uploaded build');
      await this.logReleaseAction('mobile_release.apple.uploaded', release, user, ipAddress, 'success');
      return this.toDto(release);
    } catch (error) {
      await this.failRelease(release, error, startedAt);
      await this.logReleaseAction('mobile_release.apple.failed', release, user, ipAddress, 'failed');
      throw error;
    }
  }

  async submitApple(user: JwtUserPayload, releaseId: string, destination: 'TESTFLIGHT' | 'APP_REVIEW') {
    this.ensureUploader(user);
    const release = await this.releasesRepo.findOne({ where: { id: releaseId, platform: 'APP_STORE' } });
    if (!release) throw new NotFoundException('Release not found.');
    this.ensureTenantAccess(user, release.tenantId);
    if (!release.appleBuildId) throw new BadRequestException('Apple Build ID is missing.');
    const settings = await this.requiredSettings(release.tenantId);
    const apiKey = this.crypto.decrypt(settings.appleApiKeyEncrypted);
    if (!apiKey || !settings.appleIssuerId || !settings.appleKeyId || !settings.appleBundleIdentifier) {
      throw new BadRequestException('Missing Credentials');
    }
    if (release.packageName !== settings.appleBundleIdentifier) {
      throw new BadRequestException('Package Name Mismatch');
    }
    const result = await this.providers.submitAppleBuild({
      issuerId: settings.appleIssuerId,
      keyId: settings.appleKeyId,
      apiKey,
      bundleIdentifier: settings.appleBundleIdentifier,
      teamId: settings.appleTeamId,
      versionName: release.versionName,
      buildId: release.appleBuildId,
      destination,
    });
    release.processingStatus = result.processingStatus;
    release.status = destination === 'APP_REVIEW' ? 'UPLOADED' : 'PROCESSING';
    release.progress = Math.max(release.progress, 90);
    release.metadata = { ...(release.metadata ?? {}), submittedTo: destination };
    await this.releasesRepo.save(release);
    await this.event(release, destination === 'TESTFLIGHT' ? 'TestFlight Ready' : 'Submit For Review', release.progress, null);
    return this.toDto(release);
  }

  async rollback(user: JwtUserPayload, releaseId: string, ipAddress?: string) {
    this.ensureUploader(user);
    const previous = await this.releasesRepo.findOne({ where: { id: releaseId } });
    if (!previous) throw new NotFoundException('Release not found.');
    this.ensureTenantAccess(user, previous.tenantId);
    if (!['PUBLISHED', 'UPLOADED', 'PROCESSING'].includes(previous.status)) {
      throw new BadRequestException('Rollback requires a previous successful release.');
    }
    if (previous.platform === 'GOOGLE_PLAY') {
      return this.uploadGooglePlay(user, {
        artifactId: previous.artifactId,
        track: previous.releaseTrack as UploadGooglePlayDto['track'],
        releaseNotes: `Rollback to ${previous.versionName}+${previous.buildNumber}`,
      }, ipAddress);
    }
    return this.uploadAppStore(user, {
      artifactId: previous.artifactId,
      releaseNotes: `Rollback to ${previous.versionName}+${previous.buildNumber}`,
    }, ipAddress);
  }

  private async requiredSettings(tenantId: string): Promise<MobileReleaseSettings> {
    const settings = await this.settingsRepo.findOne({ where: { tenantId } });
    if (!settings) throw new BadRequestException('Missing Credentials');
    return settings;
  }

  private async resolveArtifact(
    tenantId: string,
    artifactType: BuildArtifact['artifactType'],
    artifactId?: string,
  ): Promise<{ artifact: BuildArtifact; job: BuildJob; absolutePath: string }> {
    const qb = this.artifactsRepo
      .createQueryBuilder('artifact')
      .innerJoinAndMapOne('artifact.job', BuildJob, 'job', 'job.id = artifact.build_job_id')
      .where('job.tenant_id = :tenantId', { tenantId })
      .andWhere('job.status = :status', { status: 'SUCCESS' })
      .andWhere('artifact.artifact_type = :artifactType', { artifactType });
    if (artifactId) qb.andWhere('artifact.id = :artifactId', { artifactId });
    qb.orderBy('artifact.created_at', 'DESC');
    const artifact = (await qb.getOne()) as (BuildArtifact & { job?: BuildJob }) | null;
    if (!artifact?.job) throw new NotFoundException(artifactType === 'IPA' ? 'IPA artifact not found.' : 'AAB artifact not found.');
    if (!artifact.versionName || !artifact.versionCode) throw new BadRequestException('Verify version failed.');
    const absolutePath = this.resolveArtifactPath(artifact.filePath);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat?.isFile()) throw new NotFoundException('Build artifact file is missing from storage.');
    await this.validateArtifactLocalization(artifact.job, absolutePath);
    return { artifact, job: artifact.job, absolutePath };
  }

  private async validateArtifactLocalization(buildJob: BuildJob, artifactPath: string): Promise<void> {
    if (
      buildJob.buildType !== 'ANDROID_APK' &&
      buildJob.buildType !== 'ANDROID_AAB' &&
      buildJob.buildType !== 'IOS_IPA'
    ) {
      return;
    }
    const repoRoot = process.env.BUILD_REPO_ROOT ?? inferRepoRoot();
    const selectedTheme = buildJob.themeId ? await this.themesRepo.findOne({ where: { id: buildJob.themeId } }) : null;
    const expectedAssets = await collectExpectedMobileLocalizationAssets(repoRoot, selectedTheme);
    await validateMobileLocalizationAssetsInArtifact({
      artifactPath,
      expectedAssets,
      log: (message) => {
        console.log(message);
      },
    });
  }

  private async createRelease(
    tenantId: string,
    userId: string,
    platform: MobileReleasePlatform,
    artifactInput: { artifact: BuildArtifact; job: BuildJob },
    options: { track: string; notes: string | null; ipAddress?: string; packageName?: string },
  ): Promise<MobileRelease> {
    const release = await this.releasesRepo.save(
      this.releasesRepo.create({
        tenantId,
        buildJobId: artifactInput.job.id,
        artifactId: artifactInput.artifact.id,
        platform,
        versionName: artifactInput.artifact.versionName ?? 'unknown',
        buildNumber: artifactInput.artifact.versionCode ?? 0,
        packageName: options.packageName ?? artifactInput.job.packageName,
        releaseTrack: options.track,
        uploadedByUserId: userId,
        status: 'UPLOADING',
        progress: 10,
        buildDate: artifactInput.artifact.createdAt,
        downloadUrl: `/distributor/panel/mobile-app/artifacts/${artifactInput.artifact.id}`,
        releaseNotes: options.notes,
        metadata: { ipAddress: options.ipAddress, artifactFile: basename(artifactInput.artifact.filePath) },
      }),
    );
    await this.event(release, 'Preparing Build', 10, 'Release upload started');
    return release;
  }

  private async event(release: MobileRelease, event: string, progress: number, message: string | null) {
    release.progress = progress;
    await this.releasesRepo.save(release);
    await this.eventsRepo.save(
      this.eventsRepo.create({
        releaseId: release.id,
        tenantId: release.tenantId,
        event,
        progress,
        message,
      }),
    );
  }

  private async failRelease(release: MobileRelease, error: unknown, startedAt: number) {
    release.status = 'FAILED';
    release.progress = 100;
    release.errorMessage = error instanceof Error ? error.message : String(error);
    release.durationMs = Date.now() - startedAt;
    await this.releasesRepo.save(release);
    await this.event(release, 'Failed', 100, release.errorMessage);
  }

  private async logReleaseAction(
    action: string,
    release: MobileRelease,
    user: JwtUserPayload,
    ipAddress: string | undefined,
    result: string,
  ) {
    await this.audit.log({
      action,
      tenantId: release.tenantId,
      actorUserId: user.sub,
      metadata: {
        version: release.versionName,
        buildNumber: release.buildNumber,
        platform: release.platform,
        track: release.releaseTrack,
        ipAddress,
        durationMs: release.durationMs,
        result,
      },
    });
  }

  private resolveTenantId(user: JwtUserPayload, requestedTenantId?: string): string {
    if (PLATFORM_ROLES.includes(user.role)) {
      if (!requestedTenantId && !user.tenantId) throw new BadRequestException('tenantId is required.');
      return requestedTenantId ?? user.tenantId!;
    }
    if (!user.tenantId) throw new ForbiddenException('Tenant context required.');
    if (requestedTenantId && requestedTenantId !== user.tenantId) throw new ForbiddenException('Cross-tenant access denied.');
    return user.tenantId;
  }

  private ensureTenantAccess(user: JwtUserPayload, tenantId: string) {
    if (PLATFORM_ROLES.includes(user.role)) return;
    if (!user.tenantId || user.tenantId !== tenantId) throw new ForbiddenException('Cross-tenant access denied.');
  }

  private ensureUploader(user: JwtUserPayload) {
    if (!UPLOAD_ROLES.has(user.role)) {
      throw new ForbiddenException('Only Distributor Owner, Platform Admin, and Super Admin can upload releases.');
    }
  }

  private resolveArtifactPath(filePath: string): string {
    const appRoot = resolve(process.cwd());
    const absolutePath = isAbsolute(filePath) ? resolve(filePath) : resolve(join(appRoot, filePath));
    if (absolutePath !== appRoot && !absolutePath.startsWith(`${appRoot}\\`) && !absolutePath.startsWith(`${appRoot}/`)) {
      throw new NotFoundException('Build artifact path is outside application storage.');
    }
    return absolutePath;
  }

  private toDto(release: MobileRelease) {
    return {
      id: release.id,
      tenantId: release.tenantId,
      platform: release.platform,
      versionName: release.versionName,
      buildNumber: release.buildNumber,
      packageName: release.packageName,
      releaseTrack: release.releaseTrack,
      googleReleaseId: release.googleReleaseId,
      appleBuildId: release.appleBuildId,
      buildDate: release.buildDate?.toISOString() ?? null,
      uploadDate: release.uploadDate?.toISOString() ?? null,
      uploadedByUserId: release.uploadedByUserId,
      status: release.status,
      progress: release.progress,
      processingStatus: release.processingStatus,
      errorMessage: release.errorMessage,
      downloadUrl: release.downloadUrl,
      releaseNotes: release.releaseNotes,
      durationMs: release.durationMs,
      createdAt: release.createdAt.toISOString(),
    };
  }
}

function clean(next: string | undefined, current: string | null | undefined): string | null {
  if (next === undefined) return current ?? null;
  const trimmed = next.trim();
  return trimmed.length ? trimmed : null;
}

function isMissingRelation(error: unknown): boolean {
  return error instanceof QueryFailedError && (error as QueryFailedError & { code?: string }).code === '42P01';
}

function inferRepoRoot(): string {
  const cwd = process.cwd();
  return /[\\/]backend$/u.test(cwd) ? resolve(cwd, '..') : cwd;
}
