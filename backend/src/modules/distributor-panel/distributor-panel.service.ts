import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import { basename, isAbsolute, join, resolve } from 'path';
import { Repository } from 'typeorm';
import { BuildService } from '../../build-system/build.service';
import { AppVersion } from '../../common/entities/app-version.entity';
import { BuildArtifact } from '../../common/entities/build-artifact.entity';
import { BuildJob } from '../../common/entities/build-job.entity';
import { PlatformWhatsappNumber } from '../../common/entities/platform-whatsapp-number.entity';
import { TenantDomain } from '../../common/entities/tenant-domain.entity';
import { TenantDistributorApp } from '../../common/entities/tenant-app.entity';
import { TenantOnboarding } from '../../common/entities/tenant-onboarding.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { TenantThemeSettings } from '../../common/entities/tenant-theme-settings.entity';
import { WhatsappMessage } from '../../common/entities';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  AppConfigService,
  type AppConfigPublic,
} from '../app-config/app-config.service';
import type { UpdateAppConfigDto } from '../app-config/dto/update-app-config.dto';
import { normalizePlatformLanguageCode } from '../distributor-onboarding/distributor-onboarding.service';
import type { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { areQueuesEnabled } from '../../workers/queue-factory';

const UPI_ID_RE = /^[A-Za-z0-9._-]{2,128}@[A-Za-z][A-Za-z0-9._-]{2,64}$/;

function normalizeUpiId(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, '').toLowerCase();
}

export type WhiteLabelWebsiteDto = {
  status: 'ready' | 'pending';
  productionUrl: string | null;
  devUrl: string | null;
};

export type WhiteLabelMobileAppDto = {
  enabled: boolean;
  status: string;
  appName: string;
  packageName: string;
  canRequestBuild: boolean;
  latestBuildId: string | null;
  downloadUrl: string | null;
  currentVersion: string | null;
  buildNumber: number | null;
  buildTime: string | null;
  buildStatus: string | null;
  buildHistory: MobileBuildHistoryDto[];
  releaseActions: MobileReleaseActionsDto;
};

export type MobileReleaseActionsDto = {
  buildSuccessful: boolean;
  canUploadReleases: boolean;
  canViewReleaseHistory: boolean;
  apkDownloadUrl: string | null;
  aabDownloadUrl: string | null;
  ipaDownloadUrl: string | null;
  canUploadGooglePlay: boolean;
  canUploadAppStore: boolean;
  googlePlayBlockedReason: string | null;
  appStoreBlockedReason: string | null;
};

export type MobileBuildHistoryDto = {
  id: string;
  version: string;
  buildNumber: number;
  platform: 'ANDROID' | 'IOS';
  artifactType: 'APK' | 'AAB' | 'IPA' | 'WEB_BUNDLE' | null;
  date: string;
  status: string;
  downloadUrl: string | null;
};

export type WhiteLabelStatusDto = {
  website: WhiteLabelWebsiteDto;
  mobileApp: WhiteLabelMobileAppDto;
};

export type DistributorWhatsappAnalyticsDto = {
  /** True when platform has an active WhatsApp line for this tenant (no phone id or token exposed). */
  integrationEnabled: boolean;
  messagesSent: number;
  messagesReceived: number;
  lastMessageAt: string | null;
  lastMessageDirection: 'IN' | 'OUT' | null;
  lastMessagePreview: string | null;
};

export type DistributorPaymentSettingsDto = {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
};

type CurrentMobileBuildMetadata = {
  versionName: string | null;
  buildNumber: number | null;
  buildTime: Date | null;
  buildStatus: string | null;
};

@Injectable()
export class DistributorPanelService {
  constructor(
    private readonly config: ConfigService,
    private readonly appConfig: AppConfigService,
    private readonly buildService: BuildService,
    @InjectRepository(TenantDomain)
    private readonly domainRepo: Repository<TenantDomain>,
    @InjectRepository(TenantDistributorApp)
    private readonly appRepo: Repository<TenantDistributorApp>,
    @InjectRepository(BuildJob)
    private readonly buildJobsRepo: Repository<BuildJob>,
    @InjectRepository(BuildArtifact)
    private readonly buildArtifactsRepo: Repository<BuildArtifact>,
    @InjectRepository(AppVersion)
    private readonly appVersionsRepo: Repository<AppVersion>,
    @InjectRepository(TenantThemeSettings)
    private readonly tenantThemeSettingsRepo: Repository<TenantThemeSettings>,
    @InjectRepository(TenantOnboarding)
    private readonly onboardingRepo: Repository<TenantOnboarding>,
    @InjectRepository(TenantProfile)
    private readonly profileRepo: Repository<TenantProfile>,
    @InjectRepository(WhatsappMessage)
    private readonly waMsgRepo: Repository<WhatsappMessage>,
    @InjectRepository(PlatformWhatsappNumber)
    private readonly platformWaRepo: Repository<PlatformWhatsappNumber>,
  ) {}

  async getWhiteLabelStatus(
    tenantId: string,
    role?: UserRole,
  ): Promise<WhiteLabelStatusDto> {
    const platformDomain = this.config.get<string>(
      'app.platformDomain',
      'platform.local',
    );
    const storefrontDevPort = this.config.get<number>(
      'storefront.devPort',
      5175,
    );
    const domain = await this.domainRepo.findOne({
      where: { tenantId },
      select: ['subdomain', 'customDomain', 'domainType', 'status'],
    });
    const app = await this.appRepo.findOne({
      where: { tenantId },
      select: ['appName', 'packageName', 'status'],
    });
    const latestBuild = await this.buildJobsRepo.findOne({
      where: { tenantId, buildType: 'ANDROID_APK' },
      order: { createdAt: 'DESC' },
      select: ['id', 'status', 'createdAt', 'startedAt'],
    });
    const [latestArtifact, latestAabArtifact, latestIpaArtifact] =
      await Promise.all([
        this.findLatestSuccessfulArtifact(tenantId, 'APK'),
        this.findLatestSuccessfulArtifact(tenantId, 'AAB'),
        this.findLatestSuccessfulArtifact(tenantId, 'IPA'),
      ]);
    const [currentBuild, buildHistory] = await Promise.all([
      this.findCurrentMobileBuildMetadata(tenantId, latestArtifact).catch(
        () => ({
          versionName: null,
          buildNumber: null,
          buildTime: null,
          buildStatus: latestBuild?.status ?? null,
        }),
      ),
      this.listAppBuildHistory(tenantId).catch(() => []),
    ]);

    let productionUrl: string | null = null;
    let devUrl: string | null = null;
    if (domain?.status === 'active') {
      if (domain.domainType === 'custom' && domain.customDomain) {
        productionUrl = `https://${domain.customDomain}`;
      } else if (domain.subdomain) {
        productionUrl = `https://${domain.subdomain}.${platformDomain}`;
        devUrl = `http://${domain.subdomain}.localhost:${storefrontDevPort}`;
      }
    }

    const website: WhiteLabelWebsiteDto = {
      status: productionUrl ? 'ready' : 'pending',
      productionUrl,
      devUrl,
    };

    const rawStatus = app?.status ?? 'skipped';
    const mobileEnabled = rawStatus !== 'skipped';
    const normalizedStatus = this.normalizeMobileAppStatus(
      rawStatus,
      latestBuild?.status,
      !!latestArtifact,
      latestBuild?.startedAt ?? latestBuild?.createdAt,
    );

    const canRequestBuild =
      mobileEnabled &&
      (['pending_build', 'failed', 'ready'].includes(normalizedStatus) ||
        (normalizedStatus === 'building' && !!latestArtifact));

    const buildSuccessful =
      normalizedStatus === 'ready' ||
      currentBuild.buildStatus === 'SUCCESS' ||
      latestBuild?.status === 'SUCCESS' ||
      !!latestArtifact ||
      !!latestAabArtifact ||
      !!latestIpaArtifact;
    const canUploadReleases =
      role === UserRole.OWNER ||
      role === UserRole.SUPER_ADMIN ||
      role === UserRole.PLATFORM_SUPPORT;
    const mobileApp: WhiteLabelMobileAppDto = {
      enabled: mobileEnabled,
      status: mobileEnabled ? normalizedStatus : 'skipped',
      appName: app?.appName ?? '',
      packageName: app?.packageName ?? '',
      canRequestBuild,
      latestBuildId: latestBuild?.id ?? null,
      downloadUrl:
        mobileEnabled && latestArtifact
          ? '/distributor/panel/mobile-app/artifact/latest'
          : null,
      currentVersion: currentBuild.versionName,
      buildNumber: currentBuild.buildNumber,
      buildTime: currentBuild.buildTime?.toISOString() ?? null,
      buildStatus: currentBuild.buildStatus ?? latestBuild?.status ?? null,
      buildHistory,
      releaseActions: {
        buildSuccessful,
        canUploadReleases,
        canViewReleaseHistory: mobileEnabled,
        apkDownloadUrl:
          mobileEnabled && latestArtifact
            ? '/distributor/panel/mobile-app/artifact/latest'
            : null,
        aabDownloadUrl: latestAabArtifact
          ? `/distributor/panel/mobile-app/artifacts/${latestAabArtifact.id}`
          : null,
        ipaDownloadUrl: latestIpaArtifact
          ? `/distributor/panel/mobile-app/artifacts/${latestIpaArtifact.id}`
          : null,
        canUploadGooglePlay:
          mobileEnabled && buildSuccessful && canUploadReleases,
        canUploadAppStore:
          mobileEnabled && buildSuccessful && canUploadReleases,
        googlePlayBlockedReason: !mobileEnabled
          ? 'Mobile app is not enabled.'
          : !buildSuccessful
            ? 'Build is not successful yet.'
            : !canUploadReleases
              ? 'Only owners and platform admins can upload releases.'
              : latestAabArtifact
                ? null
                : 'AAB artifact is missing; upload will fail until the AAB build completes.',
        appStoreBlockedReason: !mobileEnabled
          ? 'Mobile app is not enabled.'
          : !buildSuccessful
            ? 'Build is not successful yet.'
            : !canUploadReleases
              ? 'Only owners and platform admins can upload releases.'
              : latestIpaArtifact
                ? null
                : 'IPA artifact is missing; upload will fail until the IPA build completes.',
      },
    };

    return { website, mobileApp };
  }

  /**
   * Reserved for the Flutter / worker build pipeline. Does not start a real build yet.
   */
  async requestMobileAppBuild(tenantId: string): Promise<{
    started: boolean;
    buildId: string | null;
    message: string;
    mobileApp: WhiteLabelMobileAppDto;
  }> {
    const app = await this.appRepo.findOne({ where: { tenantId } });
    if (!app || app.status === 'skipped') {
      throw new BadRequestException(
        'Mobile app is not enabled for this store (website-only onboarding).',
      );
    }
    const status = await this.getWhiteLabelStatus(tenantId, UserRole.OWNER);
    if (!status.mobileApp.canRequestBuild) {
      throw new BadRequestException(
        'A build is not available for the current app status.',
      );
    }
    if (!app.appName.trim() || !app.packageName.trim()) {
      throw new BadRequestException(
        'App name and package name are required before generating APK.',
      );
    }
    const selectedThemeId = await this.resolveSelectedMobileThemeId(tenantId);
    if (!selectedThemeId) {
      throw new BadRequestException(
        'Select a MOBILE theme before generating the APK.',
      );
    }
    const languages = [await this.resolveSelectedLanguageCode(tenantId)];
    const queued = await this.buildService.createTenantBuild(tenantId, {
      buildType: 'ANDROID_APK',
      appName: app.appName,
      packageName: app.packageName,
      themeId: selectedThemeId,
      languages,
    });
    const secondaryBuilds: Array<Promise<unknown>> = [];
    if (this.canQueueIosBuilds()) {
      secondaryBuilds.push(
        this.buildService.createTenantBuild(tenantId, {
          buildType: 'IOS_IPA',
          appName: app.appName,
          packageName: app.packageName,
          themeId: selectedThemeId,
          languages,
        }),
      );
    }
    await Promise.allSettled(secondaryBuilds);
    app.status =
      queued.data.status === 'FAILED'
        ? 'failed'
        : queued.data.status === 'SUCCESS'
          ? 'ready'
          : 'building';
    await this.appRepo.save(app);
    const nextStatus = await this.getWhiteLabelStatus(tenantId, UserRole.OWNER);
    return {
      started: queued.data.status !== 'FAILED',
      buildId: queued.data.id,
      message:
        queued.data.status === 'FAILED'
          ? queued.message
          : queued.data.status === 'SUCCESS'
            ? queued.message
            : this.canQueueIosBuilds()
              ? 'APK and AAB generation started as one Android release; IPA generation also started. Download buttons will appear when the workers finish.'
              : 'APK and AAB generation started as one Android release. iOS IPA is skipped because no macOS/Xcode build worker is enabled.',
      mobileApp: nextStatus.mobileApp,
    };
  }

  private async resolveSelectedMobileThemeId(
    tenantId: string,
  ): Promise<string | undefined> {
    const settings = await this.tenantThemeSettingsRepo.findOne({
      where: { tenantId },
      select: ['mobileThemeId'],
    });
    return settings?.mobileThemeId ?? undefined;
  }

  private async resolveSelectedLanguageCode(tenantId: string): Promise<string> {
    const settings = await this.appConfig.getForTenant(tenantId);
    return normalizePlatformLanguageCode(settings.selectedLanguageCode);
  }

  async getLatestMobileAppArtifact(tenantId: string): Promise<{
    absolutePath: string;
    fileName: string;
    fileSize: number;
    contentType: string;
  }> {
    const artifact = await this.findLatestSuccessfulArtifact(tenantId, 'APK');
    if (!artifact) throw new NotFoundException('APK artifact not found.');

    const absolutePath = this.resolveArtifactPath(artifact.filePath);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat?.isFile())
      throw new NotFoundException('APK file is missing from storage.');
    const app = await this.appRepo.findOne({
      where: { tenantId },
      select: ['appName', 'packageName'],
    });

    return {
      absolutePath,
      fileName: this.downloadApkFileName(app?.appName, app?.packageName),
      fileSize: stat.size,
      contentType: this.contentTypeForArtifact(artifact.artifactType),
    };
  }

  async getMobileAppArtifact(
    tenantId: string,
    artifactId: string,
  ): Promise<{
    absolutePath: string;
    fileName: string;
    fileSize: number;
    contentType: string;
  }> {
    const artifact = await this.buildArtifactsRepo
      .createQueryBuilder('artifact')
      .innerJoin(BuildJob, 'job', 'job.id = artifact.build_job_id')
      .where('artifact.id = :artifactId', { artifactId })
      .andWhere('job.tenant_id = :tenantId', { tenantId })
      .andWhere('job.status = :status', { status: 'SUCCESS' })
      .getOne();
    if (!artifact) throw new NotFoundException('Build artifact not found.');

    const absolutePath = this.resolveArtifactPath(artifact.filePath);
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat?.isFile())
      throw new NotFoundException(
        'Build artifact file is missing from storage.',
      );
    return {
      absolutePath,
      fileName: basename(artifact.filePath),
      fileSize: stat.size,
      contentType: this.contentTypeForArtifact(artifact.artifactType),
    };
  }

  async getMobileAppSettings(tenantId: string): Promise<{
    success: boolean;
    data: AppConfigPublic;
    meta: Record<string, unknown>;
    message: string;
  }> {
    const data = await this.appConfig.getForTenant(tenantId);
    return { success: true, data, meta: {}, message: '' };
  }

  async patchMobileAppSettings(
    tenantId: string,
    dto: UpdateAppConfigDto,
  ): Promise<{
    success: boolean;
    data: AppConfigPublic;
    meta: Record<string, unknown>;
    message: string;
  }> {
    const data = await this.appConfig.updateForTenant(tenantId, dto);
    return { success: true, data, meta: {}, message: '' };
  }

  async getPaymentSettings(tenantId: string): Promise<{
    success: boolean;
    data: DistributorPaymentSettingsDto;
    meta: Record<string, unknown>;
    message: string;
  }> {
    const data = await this.resolvePaymentSettings(tenantId);
    return { success: true, data, meta: {}, message: '' };
  }

  async patchPaymentSettings(
    tenantId: string,
    dto: UpdatePaymentSettingsDto,
  ): Promise<{
    success: boolean;
    data: DistributorPaymentSettingsDto;
    meta: Record<string, unknown>;
    message: string;
  }> {
    let row = await this.onboardingRepo.findOne({ where: { tenantId } });
    if (!row) {
      row = this.onboardingRepo.create({
        tenantId,
        currentStep: 7,
        status: 'complete',
        payloadJson: {},
        completedAt: new Date(),
      });
    }
    const current = (row.payloadJson ?? {}) as Record<string, unknown>;
    const patch = this.normalizePaymentPatch(dto);
    const next = { ...current, ...patch };
    const required: Array<keyof DistributorPaymentSettingsDto> = [
      'accountHolderName',
      'bankName',
      'accountNumber',
      'ifsc',
      'upiId',
    ];
    if (required.some((key) => !this.text(next[key]))) {
      throw new BadRequestException(
        'Bank account holder, bank name, account number, IFSC and UPI ID are required.',
      );
    }
    row.payloadJson = next;
    await this.onboardingRepo.save(row);
    const data = await this.resolvePaymentSettings(tenantId);
    return { success: true, data, meta: {}, message: 'Payment settings saved.' };
  }

  private normalizePaymentPatch(
    input: Partial<DistributorPaymentSettingsDto>,
  ): Partial<DistributorPaymentSettingsDto> {
    const patch: Partial<DistributorPaymentSettingsDto> = {};
    if (input.accountHolderName !== undefined) {
      patch.accountHolderName = this.text(input.accountHolderName).slice(0, 255);
    }
    if (input.bankName !== undefined) {
      patch.bankName = this.text(input.bankName).slice(0, 255);
    }
    if (input.accountNumber !== undefined) {
      patch.accountNumber = this.text(input.accountNumber)
        .replace(/[^\d]/g, '')
        .slice(0, 64);
    }
    if (input.ifsc !== undefined) {
      patch.ifsc = this.text(input.ifsc).replace(/\s/g, '').toUpperCase().slice(0, 32);
    }
    if (input.branch !== undefined) {
      patch.branch = this.text(input.branch).slice(0, 255);
    }
    if (input.upiId !== undefined) {
      const upiId = normalizeUpiId(input.upiId).slice(0, 255);
      if (!UPI_ID_RE.test(upiId)) {
        throw new BadRequestException(
          'Enter a valid UPI ID such as name@bank. Do not add +91, spaces, account number or IFSC.',
        );
      }
      patch.upiId = upiId;
    }
    return patch;
  }

  private async resolvePaymentSettings(
    tenantId: string,
  ): Promise<DistributorPaymentSettingsDto> {
    const [row, profile] = await Promise.all([
      this.onboardingRepo.findOne({ where: { tenantId } }),
      this.profileRepo.findOne({
        where: { tenantId },
        select: ['businessName'],
      }),
    ]);
    const p = (row?.payloadJson ?? {}) as Record<string, unknown>;
    return {
      accountHolderName:
        this.text(p['accountHolderName']) || profile?.businessName || '',
      bankName: this.text(p['bankName']),
      accountNumber: this.text(p['accountNumber']),
      ifsc: this.text(p['ifsc']),
      branch: this.text(p['branch']),
      upiId: normalizeUpiId(p['upiId']),
    };
  }

  private text(value: unknown): string {
    return String(value ?? '').trim();
  }

  async getWhatsappAnalytics(
    tenantId: string,
  ): Promise<DistributorWhatsappAnalyticsDto> {
    const integrationEnabled = await this.platformWaRepo.exist({
      where: { tenantId, isActive: true },
    });
    const [messagesSent, messagesReceived] = await Promise.all([
      this.waMsgRepo.count({ where: { tenantId, direction: 'OUT' } }),
      this.waMsgRepo.count({ where: { tenantId, direction: 'IN' } }),
    ]);
    const last = await this.waMsgRepo.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      select: ['message', 'direction', 'createdAt'],
    });
    return {
      integrationEnabled,
      messagesSent,
      messagesReceived,
      lastMessageAt: last?.createdAt?.toISOString() ?? null,
      lastMessageDirection: last ? (last.direction as 'IN' | 'OUT') : null,
      lastMessagePreview: last?.message ? last.message.slice(0, 200) : null,
    };
  }

  private normalizeMobileAppStatus(
    rawStatus: string,
    latestBuildStatus: BuildJob['status'] | undefined,
    hasArtifact: boolean,
    activeBuildAt?: Date | null,
  ): string {
    if (hasArtifact) return 'ready';
    if (
      (latestBuildStatus === 'QUEUED' || latestBuildStatus === 'RUNNING') &&
      this.isStaleActiveBuild(activeBuildAt)
    ) {
      return hasArtifact ? 'ready' : 'failed';
    }
    if (
      !areQueuesEnabled(this.config) &&
      (latestBuildStatus === 'QUEUED' || latestBuildStatus === 'RUNNING')
    ) {
      return 'building';
    }
    if (latestBuildStatus === 'QUEUED' || latestBuildStatus === 'RUNNING') {
      return 'building';
    }
    if (latestBuildStatus === 'FAILED' || rawStatus === 'failed')
      return 'failed';
    if (
      (latestBuildStatus === 'SUCCESS' && hasArtifact) ||
      rawStatus === 'ready'
    )
      return 'ready';
    if (rawStatus === 'building') return 'pending_build';
    if (rawStatus === 'configured' || rawStatus === 'draft')
      return 'pending_build';
    return rawStatus;
  }

  private async findCurrentMobileBuildMetadata(
    tenantId: string,
    latestApkArtifact: BuildArtifact | null,
  ): Promise<CurrentMobileBuildMetadata> {
    const legacyVersion = await this.findLatestLegacyAppVersion(tenantId);
    if (latestApkArtifact) {
      return {
        versionName:
          latestApkArtifact.versionName ?? legacyVersion?.versionName ?? null,
        buildNumber:
          latestApkArtifact.versionCode ?? legacyVersion?.buildNumber ?? null,
        buildTime:
          latestApkArtifact.createdAt ?? legacyVersion?.buildTime ?? null,
        buildStatus: 'SUCCESS',
      };
    }
    return (
      legacyVersion ?? {
        versionName: null,
        buildNumber: null,
        buildTime: null,
        buildStatus: null,
      }
    );
  }

  private async findLatestSuccessfulArtifact(
    tenantId: string,
    artifactType: BuildArtifact['artifactType'],
  ): Promise<BuildArtifact | null> {
    return this.buildArtifactsRepo
      .createQueryBuilder('artifact')
      .innerJoin(BuildJob, 'job', 'job.id = artifact.build_job_id')
      .where('job.tenant_id = :tenantId', { tenantId })
      .andWhere('job.status = :status', { status: 'SUCCESS' })
      .andWhere('artifact.artifact_type = :artifactType', { artifactType })
      .orderBy('artifact.created_at', 'DESC')
      .getOne();
  }

  private async listAppBuildHistory(
    tenantId: string,
  ): Promise<MobileBuildHistoryDto[]> {
    const columns = await this.appVersionColumns();
    const hasArtifactId = columns.has('artifact_id');
    const hasPlatform = columns.has('platform');
    const hasBuildNumber = columns.has('build_number');
    const hasBuildStatus = columns.has('build_status');
    const hasStartedAt = columns.has('started_at');
    const hasCompletedAt = columns.has('completed_at');
    const versions = (await this.appVersionsRepo.query(
      `
        SELECT
          id,
          ${hasArtifactId ? 'artifact_id' : 'NULL'} AS "artifactId",
          version_name AS "versionName",
          version_code AS "versionCode",
          ${hasBuildNumber ? 'build_number' : 'version_code'} AS "buildNumber",
          ${hasPlatform ? 'platform' : `'ANDROID'`} AS "platform",
          ${hasBuildStatus ? 'build_status' : `'SUCCESS'`} AS "buildStatus",
          created_at AS "createdAt",
          ${hasStartedAt ? 'started_at' : 'NULL'} AS "startedAt",
          ${hasCompletedAt ? 'completed_at' : 'NULL'} AS "completedAt"
        FROM app_versions
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [tenantId],
    )) as Array<{
      id: string;
      artifactId: string | null;
      versionName: string;
      versionCode: number;
      buildNumber: number;
      platform: 'ANDROID' | 'IOS';
      buildStatus: string;
      createdAt: Date;
      startedAt: Date | null;
      completedAt: Date | null;
    }>;
    const artifactIds = versions
      .map((v) => v.artifactId)
      .filter((id): id is string => !!id);
    const artifacts = artifactIds.length
      ? await this.buildArtifactsRepo
          .createQueryBuilder('artifact')
          .where('artifact.id IN (:...artifactIds)', { artifactIds })
          .getMany()
      : [];
    const artifactById = new Map(
      artifacts.map((artifact) => [artifact.id, artifact]),
    );
    return versions
      .filter((version) => {
        if (version.platform !== 'IOS') return true;
        if (this.canQueueIosBuilds()) return true;
        return !!version.artifactId || version.buildStatus === 'SUCCESS';
      })
      .map((version) => {
        const artifact = version.artifactId
          ? artifactById.get(version.artifactId)
          : null;
        const buildNumber = version.buildNumber ?? version.versionCode;
        const statusDate = new Date(version.startedAt ?? version.createdAt);
        const isStaleActive =
          (version.buildStatus === 'RUNNING' ||
            version.buildStatus === 'QUEUED') &&
          !artifact &&
          this.isStaleActiveBuild(statusDate);
        return {
          id: version.id,
          version: version.versionName,
          buildNumber,
          platform: version.platform,
          artifactType: artifact?.artifactType ?? null,
          date: new Date(
            version.completedAt ?? version.startedAt ?? version.createdAt,
          ).toISOString(),
          status: isStaleActive ? 'FAILED' : version.buildStatus,
          downloadUrl: artifact
            ? `/distributor/panel/mobile-app/artifacts/${artifact.id}`
            : null,
        };
      });
  }

  private async findLatestLegacyAppVersion(
    tenantId: string,
  ): Promise<CurrentMobileBuildMetadata | null> {
    const columns = await this.appVersionColumns();
    const hasPlatform = columns.has('platform');
    const hasBuildNumber = columns.has('build_number');
    const hasBuildStatus = columns.has('build_status');
    const hasCompletedAt = columns.has('completed_at');
    const rows = (await this.appVersionsRepo.query(
      `
        SELECT
          version_name AS "versionName",
          ${hasBuildNumber ? 'build_number' : 'version_code'} AS "buildNumber",
          ${hasBuildStatus ? 'build_status' : `'SUCCESS'`} AS "buildStatus",
          ${hasCompletedAt ? 'COALESCE(completed_at, created_at)' : 'created_at'} AS "buildTime"
        FROM app_versions
        WHERE tenant_id = $1
          ${hasPlatform ? `AND platform = 'ANDROID'` : ''}
          ${hasBuildStatus ? `AND build_status = 'SUCCESS'` : ''}
        ORDER BY ${hasBuildNumber ? 'build_number' : 'version_code'} DESC, created_at DESC
        LIMIT 1
      `,
      [tenantId],
    )) as Array<{
      versionName: string | null;
      buildNumber: number | null;
      buildStatus: string | null;
      buildTime: Date | string | null;
    }>;
    const row = rows[0];
    if (!row) return null;
    return {
      versionName: row.versionName,
      buildNumber: row.buildNumber,
      buildStatus: row.buildStatus,
      buildTime: row.buildTime ? new Date(row.buildTime) : null,
    };
  }

  private async appVersionColumns(): Promise<Set<string>> {
    const rows = (await this.appVersionsRepo.query(
      `
        SELECT column_name AS "columnName"
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'app_versions'
      `,
    )) as Array<{ columnName: string }>;
    return new Set(rows.map((row) => row.columnName));
  }

  private isStaleActiveBuild(activeBuildAt?: Date | null): boolean {
    if (!activeBuildAt) return false;
    const timeoutMinutes = this.config.get<number>(
      'build.staleTimeoutMinutes',
      45,
    );
    const timeoutMs = Math.max(5, timeoutMinutes) * 60 * 1000;
    return Date.now() - activeBuildAt.getTime() > timeoutMs;
  }

  private canQueueIosBuilds(): boolean {
    const raw =
      this.config.get<string>('MOBILE_IOS_BUILDS_ENABLED') ??
      process.env.MOBILE_IOS_BUILDS_ENABLED;
    if (raw !== undefined)
      return ['true', '1', 'yes', 'on'].includes(raw.trim().toLowerCase());
    return process.platform === 'darwin';
  }

  private resolveArtifactPath(filePath: string): string {
    const appRoot = resolve(process.cwd());
    const absolutePath = isAbsolute(filePath)
      ? resolve(filePath)
      : resolve(join(appRoot, filePath));
    if (
      absolutePath !== appRoot &&
      !absolutePath.startsWith(`${appRoot}\\`) &&
      !absolutePath.startsWith(`${appRoot}/`)
    ) {
      throw new NotFoundException(
        'APK file path is outside application storage.',
      );
    }
    return absolutePath;
  }

  private downloadApkFileName(
    appName: string | null | undefined,
    packageName: string | null | undefined,
  ): string {
    const source = appName?.trim() || packageName?.trim() || 'mobile-app';
    const safe = source
      .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return `${safe || 'mobile-app'}.apk`;
  }

  private contentTypeForArtifact(
    artifactType: BuildArtifact['artifactType'],
  ): string {
    switch (artifactType) {
      case 'APK':
        return 'application/vnd.android.package-archive';
      case 'AAB':
        return 'application/octet-stream';
      case 'IPA':
        return 'application/octet-stream';
      default:
        return 'application/octet-stream';
    }
  }
}
