import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';
import { DataSource, Repository } from 'typeorm';
import { AppVersion } from '../common/entities/app-version.entity';
import { BuildArtifact } from '../common/entities/build-artifact.entity';
import { BuildJob } from '../common/entities/build-job.entity';
import { TenantBranding } from '../common/entities/tenant-branding.entity';
import { TenantDistributorApp } from '../common/entities/tenant-app.entity';
import { TenantThemeSettings } from '../common/entities/tenant-theme-settings.entity';
import { Theme } from '../common/entities/theme.entity';
import { PLATFORM_ROLES } from '../common/enums/user-role.enum';
import { LocalizationService } from '../common/localization/localization.service';
import { JwtUserPayload } from '../common/types/authenticated-request.type';
import { SubscriptionsService } from '../modules/subscriptions/subscriptions.service';
import { QUEUE_NAMES } from '../workers/queues';
import { AppQueue, createAppQueue } from '../workers/queue-factory';
import { CreateBuildDto } from './dto/create-build.dto';
import { ListBuildsQueryDto } from './dto/list-builds-query.dto';
import {
  BuildVersion,
  getReservedBuildVersion,
  markReservedBuildVersionFinished,
  markReservedBuildVersionStarted,
  reserveNextAppBuildVersion,
} from './app-build-versioning';
import {
  prepareMobileLocalizationAssets,
  validateMobileLocalizationAssetsInArtifact,
} from './mobile-localization-assets';
import { mobileBuildNetworkDartDefines } from './mobile-build-runtime-config';
import {
  prepareMobileThemeAssets,
  validateMobileThemeAssetsInArtifact,
} from './mobile-theme-assets';

@Injectable()
export class BuildService implements OnModuleDestroy {
  private readonly buildQueue: AppQueue;
  private readonly localBuildTasks = new Set<Promise<void>>();
  private readonly localBuildProcesses = new Set<ReturnType<typeof spawn>>();
  private shuttingDown = false;

  constructor(
    @InjectRepository(BuildJob)
    private readonly buildJobsRepo: Repository<BuildJob>,
    @InjectRepository(BuildArtifact)
    private readonly buildArtifactsRepo: Repository<BuildArtifact>,
    @InjectRepository(AppVersion)
    private readonly appVersionsRepo: Repository<AppVersion>,
    @InjectRepository(TenantDistributorApp)
    private readonly tenantAppsRepo: Repository<TenantDistributorApp>,
    @InjectRepository(TenantBranding)
    private readonly brandingRepo: Repository<TenantBranding>,
    @InjectRepository(TenantThemeSettings)
    private readonly tenantThemeSettingsRepo: Repository<TenantThemeSettings>,
    @InjectRepository(Theme)
    private readonly themesRepo: Repository<Theme>,
    private readonly dataSource: DataSource,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly localization: LocalizationService,
    configService: ConfigService,
  ) {
    this.buildQueue = createAppQueue(QUEUE_NAMES.build, configService);
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    for (const child of this.localBuildProcesses) {
      killBuildProcess(child);
    }
    await Promise.allSettled([...this.localBuildTasks]);
    await this.buildQueue.close();
  }

  async createBuild(user: JwtUserPayload, dto: CreateBuildDto) {
    const tenantId = this.resolveTenantId(user, dto.tenantId);
    return this.createTenantBuild(tenantId, dto);
  }

  async retryBuild(user: JwtUserPayload, id: string) {
    const previous = await this.buildJobsRepo.findOne({ where: { id } });
    if (!previous) throw new NotFoundException('Build not found.');
    this.ensureBuildAccess(user, previous.tenantId);
    return this.createTenantBuild(previous.tenantId, {
      buildType: previous.buildType,
      packageName: previous.packageName,
      appName: previous.appName,
      themeId: previous.themeId ?? undefined,
      languages: previous.languages,
    });
  }

  async createTenantBuild(
    tenantId: string,
    dto: Omit<CreateBuildDto, 'tenantId'>,
  ) {
    const limits =
      await this.subscriptionsService.getPlanLimitByTenant(tenantId);
    const priority = this.mapPriority(limits.buildPriority);
    const languages = await this.resolveBuildLanguages(tenantId, dto.languages);

    const buildJob = await this.dataSource.transaction(async (manager) => {
      const created = await manager.save(
        BuildJob,
        manager.create(BuildJob, {
          tenantId,
          buildType: dto.buildType,
          packageName: dto.packageName,
          appName: dto.appName,
          themeId: dto.themeId ?? null,
          languages,
          status: 'QUEUED',
          priority,
          firebaseAppId: null,
          startedAt: null,
          completedAt: null,
          errorMessage: null,
        }),
      );
      await reserveNextAppBuildVersion(manager, created);
      return created;
    });

    let queueResult: unknown;
    try {
      queueResult = await this.buildQueue.add(
        dto.buildType,
        {
          buildJobId: buildJob.id,
          tenantId,
          buildType: dto.buildType,
          packageName: dto.packageName,
          appName: dto.appName,
          themeId: dto.themeId ?? null,
          languages,
          priority,
        },
        {
          priority,
          attempts: 2,
        },
      );
    } catch (error) {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(AppVersion, { buildJobId: buildJob.id });
        await manager.delete(BuildJob, { id: buildJob.id });
      });
      throw error;
    }

    if (this.isQueueSkipped(queueResult)) {
      buildJob.status = 'RUNNING';
      buildJob.startedAt = new Date();
      buildJob.errorMessage = `${queueResult.reason}. Local Android APK build started on this machine.`;
      await this.buildJobsRepo.save(buildJob);

      const localBuildTask = this.createLocalDevArtifactInBackground(
        buildJob,
        queueResult.reason,
      );
      this.localBuildTasks.add(localBuildTask);
      void localBuildTask
        .finally(() => this.localBuildTasks.delete(localBuildTask))
        .catch(() => undefined);
      return {
        success: true,
        data: buildJob,
        meta: { queue: queueResult },
        message: `${this.displayBuildType(buildJob.buildType)} build started locally. The download button will appear when it finishes.`,
      };
    }

    return { success: true, data: buildJob, meta: {}, message: 'Build queued' };
  }

  async getBuildById(user: JwtUserPayload, id: string) {
    const build = await this.buildJobsRepo.findOne({ where: { id } });
    if (!build) throw new NotFoundException('Build not found.');
    this.ensureBuildAccess(user, build.tenantId);

    const artifacts = await this.buildArtifactsRepo.find({
      where: { buildJobId: build.id },
      order: { createdAt: 'DESC' },
    });
    return {
      success: true,
      data: { ...build, progress: this.getProgress(build.status), artifacts },
      meta: {},
      message: '',
    };
  }

  async listBuilds(user: JwtUserPayload, query: ListBuildsQueryDto) {
    const tenantId = PLATFORM_ROLES.includes(user.role)
      ? query.tenantId
      : (user.tenantId ?? undefined);
    if (!tenantId && !PLATFORM_ROLES.includes(user.role))
      throw new ForbiddenException('Tenant context required.');

    const qb = this.buildJobsRepo.createQueryBuilder('b');
    if (tenantId) qb.andWhere('b.tenant_id = :tenantId', { tenantId });
    if (query.status)
      qb.andWhere('b.status = :status', { status: query.status });
    if (query.buildType)
      qb.andWhere('b.build_type = :buildType', { buildType: query.buildType });
    qb.orderBy('b.created_at', 'DESC');
    const jobs = await qb.getMany();
    const artifacts = jobs.length
      ? await this.buildArtifactsRepo
          .createQueryBuilder('artifact')
          .where('artifact.build_job_id IN (:...ids)', {
            ids: jobs.map((job) => job.id),
          })
          .orderBy('artifact.created_at', 'DESC')
          .getMany()
      : [];
    const artifactsByJob = new Map<string, BuildArtifact[]>();
    for (const artifact of artifacts) {
      const current = artifactsByJob.get(artifact.buildJobId) ?? [];
      current.push(artifact);
      artifactsByJob.set(artifact.buildJobId, current);
    }
    const data = jobs.map((job) => ({
      ...job,
      progress: this.getProgress(job.status),
      artifacts: artifactsByJob.get(job.id) ?? [],
    }));
    return { success: true, data, meta: {}, message: '' };
  }

  async getArtifact(user: JwtUserPayload, artifactId: string) {
    const artifact = await this.buildArtifactsRepo.findOne({
      where: { id: artifactId },
    });
    if (!artifact) throw new NotFoundException('Build artifact not found.');
    const job = await this.buildJobsRepo.findOne({
      where: { id: artifact.buildJobId },
    });
    if (!job || job.status !== 'SUCCESS') {
      throw new NotFoundException('Successful build not found.');
    }
    this.ensureBuildAccess(user, job.tenantId);
    const absolutePath = resolve(process.cwd(), artifact.filePath);
    const pathFromRoot = relative(resolve(process.cwd()), absolutePath);
    if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
      throw new NotFoundException('Build artifact path is outside storage.');
    }
    const stat = await fs.stat(absolutePath).catch(() => null);
    if (!stat?.isFile()) {
      throw new NotFoundException(
        'Build artifact file is missing from storage.',
      );
    }
    return {
      absolutePath,
      fileName: basename(absolutePath),
      fileSize: stat.size,
      contentType:
        artifact.artifactType === 'APK'
          ? 'application/vnd.android.package-archive'
          : 'application/octet-stream',
    };
  }

  private resolveTenantId(
    user: JwtUserPayload,
    requestedTenantId?: string,
  ): string {
    if (PLATFORM_ROLES.includes(user.role)) {
      if (!requestedTenantId)
        throw new BadRequestException(
          'tenantId is required for platform users.',
        );
      return requestedTenantId;
    }
    if (!user.tenantId)
      throw new ForbiddenException('Tenant context required.');
    if (requestedTenantId && requestedTenantId !== user.tenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }
    return user.tenantId;
  }

  private ensureBuildAccess(user: JwtUserPayload, tenantId: string) {
    if (PLATFORM_ROLES.includes(user.role)) return;
    if (!user.tenantId || user.tenantId !== tenantId)
      throw new ForbiddenException('Cross-tenant access denied.');
  }

  private mapPriority(buildPriority: string): number {
    switch (buildPriority.toUpperCase()) {
      case 'HIGH':
        return 10;
      case 'MEDIUM':
        return 5;
      default:
        return 1;
    }
  }

  private getProgress(status: BuildJob['status']): number {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'QUEUED':
        return 10;
      case 'RUNNING':
        return 45;
      case 'FAILED':
        return 100;
      case 'SUCCESS':
        return 100;
      default:
        return 0;
    }
  }

  private async resolveBuildLanguages(
    tenantId: string,
    requested?: string[],
  ): Promise<string[]> {
    const normalized = (requested ?? [])
      .map((value) => this.localization.resolveLanguage(value))
      .filter((value, index, values) => values.indexOf(value) === index);
    if (normalized.length) return normalized;
    return [await this.localization.currentLanguage(tenantId)];
  }

  private isQueueSkipped(
    value: unknown,
  ): value is { skipped: true; reason: string } {
    return (
      !!value &&
      typeof value === 'object' &&
      (value as { skipped?: unknown }).skipped === true &&
      typeof (value as { reason?: unknown }).reason === 'string'
    );
  }

  private async createLocalDevArtifactInBackground(
    buildJob: BuildJob,
    reason: string,
  ): Promise<void> {
    try {
      await this.createLocalDevArtifact(buildJob, reason);
    } catch (error) {
      buildJob.status = 'FAILED';
      buildJob.completedAt = new Date();
      buildJob.errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.buildJobsRepo.save(buildJob);
      await markReservedBuildVersionFinished(
        this.appVersionsRepo,
        buildJob,
        'FAILED',
      );
    }
  }

  private async createLocalDevArtifact(
    buildJob: BuildJob,
    reason: string,
  ): Promise<void> {
    const artifactsRoot =
      process.env.BUILD_ARTIFACTS_ROOT ?? join('storage', 'build-artifacts');
    const safeAppName =
      buildJob.appName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'mobile-app';
    const fileName =
      buildJob.buildType === 'ANDROID_AAB'
        ? `${buildJob.id}-${safeAppName}-release.aab`
        : `${buildJob.id}-${safeAppName}-release.apk`;
    const artifactRelativePath = join(
      artifactsRoot,
      `tenant_${buildJob.tenantId}`,
      fileName,
    );
    const artifactPath = join(process.cwd(), artifactRelativePath);
    // An Android rebuild is one release, so keep the installable APK and the
    // Play Store AAB on the same build job/version. The build helpers already
    // support a companion bundle; leaving these paths null meant APK rebuilds
    // could never create the AAB advertised by the distributor panel.
    const companionAabRelativePath =
      buildJob.buildType === 'ANDROID_APK'
        ? join(
            artifactsRoot,
            `tenant_${buildJob.tenantId}`,
            `${buildJob.id}-${safeAppName}-release.aab`,
          )
        : null;
    const companionAabPath = companionAabRelativePath
      ? join(process.cwd(), companionAabRelativePath)
      : null;
    await fs.mkdir(
      join(process.cwd(), artifactsRoot, `tenant_${buildJob.tenantId}`),
      { recursive: true },
    );

    const buildVersion = await getReservedBuildVersion(
      this.appVersionsRepo,
      buildJob,
    );
    const localBuild = await this.tryBuildLocalAndroidArtifact(
      buildJob,
      artifactPath,
      buildVersion,
      companionAabPath,
    );
    if (localBuild === true) {
      const stat = await fs.stat(artifactPath);
      buildJob.status = 'SUCCESS';
      buildJob.startedAt = new Date();
      buildJob.completedAt = new Date();
      buildJob.errorMessage = null;
      await this.buildJobsRepo.save(buildJob);

      const artifact = await this.buildArtifactsRepo.save(
        this.buildArtifactsRepo.create({
          buildJobId: buildJob.id,
          artifactType: buildJob.buildType === 'ANDROID_AAB' ? 'AAB' : 'APK',
          filePath: artifactRelativePath,
          fileSize: String(stat.size),
          versionCode: buildVersion?.versionCode ?? null,
          versionName: buildVersion?.versionName ?? 'dev',
        }),
      );
      if (companionAabPath && companionAabRelativePath) {
        const aabStat = await fs.stat(companionAabPath);
        await this.buildArtifactsRepo.save(
          this.buildArtifactsRepo.create({
            buildJobId: buildJob.id,
            artifactType: 'AAB',
            filePath: companionAabRelativePath,
            fileSize: String(aabStat.size),
            versionCode: buildVersion?.versionCode ?? null,
            versionName: buildVersion?.versionName ?? 'dev',
          }),
        );
      }
      if (buildVersion) {
        await markReservedBuildVersionFinished(
          this.appVersionsRepo,
          buildJob,
          'SUCCESS',
          artifact.id,
        );
      }
      if (buildJob.buildType === 'ANDROID_APK') {
        await this.tenantAppsRepo.update(
          { tenantId: buildJob.tenantId },
          { status: 'ready' },
        );
      }
      return;
    }
    if (localBuild === false) {
      buildJob.status = 'FAILED';
      buildJob.completedAt = new Date();
      buildJob.errorMessage =
        buildJob.errorMessage ||
        `${reason}. Local Flutter ${this.displayBuildType(buildJob.buildType)} build failed.`;
      await this.buildJobsRepo.save(buildJob);
      await markReservedBuildVersionFinished(
        this.appVersionsRepo,
        buildJob,
        'FAILED',
      );
      if (buildJob.buildType === 'ANDROID_APK') {
        await this.tenantAppsRepo.update(
          { tenantId: buildJob.tenantId },
          { status: 'failed' },
        );
      }
      return;
    }

    buildJob.status = 'FAILED';
    buildJob.startedAt = new Date();
    buildJob.completedAt = new Date();
    buildJob.errorMessage = `${reason}. Neither Flutter CLI nor the Android Gradle wrapper could build a fresh ${this.displayBuildType(buildJob.buildType)} on this machine.`;
    await this.buildJobsRepo.save(buildJob);
    await markReservedBuildVersionFinished(
      this.appVersionsRepo,
      buildJob,
      'FAILED',
    );
    if (buildJob.buildType === 'ANDROID_APK') {
      await this.tenantAppsRepo.update(
        { tenantId: buildJob.tenantId },
        { status: 'failed' },
      );
    }
  }

  private async tryBuildLocalAndroidArtifact(
    buildJob: BuildJob,
    artifactPath: string,
    buildVersion: BuildVersion | null,
    companionAabPath: string | null = null,
  ): Promise<boolean | null> {
    if (
      buildJob.buildType !== 'ANDROID_APK' &&
      buildJob.buildType !== 'ANDROID_AAB'
    )
      return null;
    const repoRoot = process.env.BUILD_REPO_ROOT ?? this.inferRepoRoot();
    const templateSource =
      process.env.BUILD_MOBILE_TEMPLATE_PATH ??
      join(repoRoot, 'tenant-apps', 'mobile-app');
    const reuseWorkspace = this.shouldReuseLocalWorkspace();
    const configuredWorkspaceRoot =
      process.env.BUILD_WORKSPACE_ROOT?.trim() ||
      join(process.cwd(), 'workspace');
    const workspaceRoot = reuseWorkspace
      ? join(
          configuredWorkspaceRoot,
          'local-cache',
          this.localWorkspaceCacheKey(buildJob),
        )
      : join(configuredWorkspaceRoot, `local_${buildJob.id}`);
    const mobileAppPath = join(workspaceRoot, 'mobile-template');

    buildJob.status = 'RUNNING';
    buildJob.startedAt = new Date();
    buildJob.errorMessage = `Local Android ${this.displayBuildType(buildJob.buildType)} build is running because queues are disabled.`;
    await this.buildJobsRepo.save(buildJob);
    await markReservedBuildVersionStarted(this.appVersionsRepo, buildJob);

    try {
      if (!reuseWorkspace) {
        await fs.rm(workspaceRoot, { recursive: true, force: true });
      }
      await fs.mkdir(workspaceRoot, { recursive: true });
      await fs.cp(templateSource, mobileAppPath, {
        recursive: true,
        force: true,
        filter: (src) => shouldCopyMobileTemplatePath(templateSource, src),
      });

      await this.injectLocalAndroidAppIdentity(
        mobileAppPath,
        buildJob,
        buildVersion,
      );
      await this.injectLocalLauncherIcon(mobileAppPath, buildJob);
      const selectedTheme = buildJob.themeId
        ? await this.themesRepo.findOne({ where: { id: buildJob.themeId } })
        : null;
      const localizationAssets = await prepareMobileLocalizationAssets({
        mobileAppPath,
        repoRoot,
        selectedTheme,
        languages: buildJob.languages,
        log: (message) => {
          console.log(message);
        },
      });
      const themeAssets = await prepareMobileThemeAssets({
        mobileAppPath,
        repoRoot,
        selectedTheme,
        language: buildJob.languages?.[0],
        log: (message) => {
          console.log(message);
        },
      });

      console.log('[BUILD] Starting mobile build...');
      const flutterResult = await this.tryBuildWithFlutterCli(
        buildJob,
        mobileAppPath,
        artifactPath,
        buildVersion,
        companionAabPath,
      );
      if (flutterResult === true) {
        await validateMobileLocalizationAssetsInArtifact({
          artifactPath,
          expectedAssets: localizationAssets,
          log: (message) => {
            console.log(message);
          },
        });
        await validateMobileThemeAssetsInArtifact({
          artifactPath,
          expectedAssets: themeAssets,
          log: (message) => {
            console.log(message);
          },
        });
        if (companionAabPath) {
          await validateMobileLocalizationAssetsInArtifact({
            artifactPath: companionAabPath,
            expectedAssets: localizationAssets,
            log: (message) => {
              console.log(message);
            },
          });
          await validateMobileThemeAssetsInArtifact({
            artifactPath: companionAabPath,
            expectedAssets: themeAssets,
            log: (message) => {
              console.log(message);
            },
          });
        }
      }
      if (flutterResult !== null) return flutterResult;

      const gradleResult = await this.tryBuildWithGradleWrapper(
        buildJob,
        mobileAppPath,
        artifactPath,
        companionAabPath,
      );
      if (gradleResult === true) {
        await validateMobileLocalizationAssetsInArtifact({
          artifactPath,
          expectedAssets: localizationAssets,
          log: (message) => {
            console.log(message);
          },
        });
        await validateMobileThemeAssetsInArtifact({
          artifactPath,
          expectedAssets: themeAssets,
          log: (message) => {
            console.log(message);
          },
        });
        if (companionAabPath) {
          await validateMobileLocalizationAssetsInArtifact({
            artifactPath: companionAabPath,
            expectedAssets: localizationAssets,
            log: (message) => {
              console.log(message);
            },
          });
          await validateMobileThemeAssetsInArtifact({
            artifactPath: companionAabPath,
            expectedAssets: themeAssets,
            log: (message) => {
              console.log(message);
            },
          });
        }
      }
      return gradleResult;
    } finally {
      if (!reuseWorkspace) {
        await fs
          .rm(workspaceRoot, { recursive: true, force: true })
          .catch(() => undefined);
      }
    }
  }

  private async tryBuildWithFlutterCli(
    buildJob: BuildJob,
    mobileAppPath: string,
    artifactPath: string,
    buildVersion: BuildVersion | null,
    companionAabPath: string | null,
  ): Promise<boolean | null> {
    const flutterCommand = this.resolveFlutterCommand();
    const flutterOk = await this.commandExists(flutterCommand);
    if (!flutterOk) return null;

    try {
      const args = [
        'build',
        buildJob.buildType === 'ANDROID_AAB' ? 'appbundle' : 'apk',
        '--release',
        ...buildVersionArgs(buildVersion),
        `--dart-define=TENANT_ID=${buildJob.tenantId}`,
        `--dart-define=TENANT=${buildJob.tenantId}`,
        `--dart-define=THEME_ID=${buildJob.themeId ?? ''}`,
        `--dart-define=APP_NAME_B64=${toBase64Utf8(buildJob.appName)}`,
        `--dart-define=APP_LANGUAGE=${encodeURIComponent(buildJob.languages?.[0] ?? 'en')}`,
        '--dart-define=LANGUAGE_CONSISTENCY_ENABLED=true',
        ...mobileBuildNetworkDartDefines().map(
          (value) => `--dart-define=${value}`,
        ),
      ];
      const gradleUserHome = this.resolveBuildGradleUserHome();
      await fs.mkdir(gradleUserHome, { recursive: true });
      const buildEnv = {
        ...process.env,
        GRADLE_USER_HOME: gradleUserHome,
      };
      await this.execCommand(
        flutterCommand,
        ['pub', 'get'],
        mobileAppPath,
        5 * 60 * 1000,
        buildEnv,
      );
      await this.execCommand(
        flutterCommand,
        args,
        mobileAppPath,
        this.localBuildTimeoutMs(),
        buildEnv,
      );
      if (companionAabPath) {
        const companionArgs = [
          'build',
          'appbundle',
          '--release',
          ...buildVersionArgs(buildVersion),
          ...args.filter((value) => value.startsWith('--dart-define=')),
        ];
        await this.execCommand(
          flutterCommand,
          companionArgs,
          mobileAppPath,
          this.localBuildTimeoutMs(),
          buildEnv,
        );
      }
      const builtArtifact =
        buildJob.buildType === 'ANDROID_AAB'
          ? join(
              mobileAppPath,
              'build',
              'app',
              'outputs',
              'bundle',
              'release',
              'app-release.aab',
            )
          : await this.findBuiltReleaseApk(mobileAppPath);
      if (!builtArtifact) {
        throw new Error(
          `Flutter build completed but ${this.displayBuildType(buildJob.buildType)} output was not found.`,
        );
      }
      await fs.copyFile(builtArtifact, artifactPath);
      if (companionAabPath) {
        const builtAab = await this.findBuiltReleaseAab(mobileAppPath);
        if (!builtAab) {
          throw new Error(
            'Flutter build completed but AAB output was not found.',
          );
        }
        await fs.copyFile(builtAab, companionAabPath);
      }
      return true;
    } catch (error) {
      buildJob.errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.buildJobsRepo.save(buildJob);
      return false;
    }
  }

  private async tryBuildWithGradleWrapper(
    buildJob: BuildJob,
    mobileAppPath: string,
    artifactPath: string,
    companionAabPath: string | null,
  ): Promise<boolean | null> {
    const androidPath = join(mobileAppPath, 'android');
    const gradleCommand =
      process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    const gradlePath = join(androidPath, gradleCommand);
    try {
      await fs.access(gradlePath);
    } catch {
      return null;
    }

    const dartDefines = [
      `TENANT_ID=${buildJob.tenantId}`,
      `TENANT=${buildJob.tenantId}`,
      `THEME_ID=${buildJob.themeId ?? ''}`,
      `APP_NAME_B64=${toBase64Utf8(buildJob.appName)}`,
      `APP_LANGUAGE=${encodeURIComponent(buildJob.languages?.[0] ?? 'en')}`,
      'LANGUAGE_CONSISTENCY_ENABLED=true',
      ...mobileBuildNetworkDartDefines(),
    ];

    const tasks =
      buildJob.buildType === 'ANDROID_AAB'
        ? [':app:bundleRelease']
        : companionAabPath
          ? [':app:assembleRelease', ':app:bundleRelease']
          : [':app:assembleRelease'];
    const args = [
      ...tasks,
      `-Pdart-defines=${dartDefines.map((value) => Buffer.from(value, 'utf8').toString('base64')).join(',')}`,
    ];

    try {
      buildJob.errorMessage = `Local Gradle ${this.displayBuildType(buildJob.buildType)} build is running because Flutter CLI is not responding.`;
      await this.buildJobsRepo.save(buildJob);
      const gradleUserHome = this.resolveBuildGradleUserHome();
      await fs.mkdir(gradleUserHome, { recursive: true });
      const gradleInvocation = await this.resolveGradleInvocation(
        androidPath,
        gradlePath,
        args,
      );
      await this.execCommand(
        gradleInvocation.command,
        gradleInvocation.args,
        androidPath,
        this.localBuildTimeoutMs(),
        {
          ...process.env,
          GRADLE_USER_HOME: gradleUserHome,
        },
      );
      const builtArtifact =
        buildJob.buildType === 'ANDROID_AAB'
          ? await this.findBuiltReleaseAab(mobileAppPath)
          : await this.findBuiltReleaseApk(mobileAppPath);
      if (!builtArtifact) {
        throw new Error(
          `Gradle build completed but ${this.displayBuildType(buildJob.buildType)} output was not found.`,
        );
      }
      await fs.copyFile(builtArtifact, artifactPath);
      if (companionAabPath) {
        const builtAab = await this.findBuiltReleaseAab(mobileAppPath);
        if (!builtAab) {
          throw new Error(
            'Gradle build completed but app-release.aab was not found.',
          );
        }
        await fs.copyFile(builtAab, companionAabPath);
      }
      return true;
    } catch (error) {
      buildJob.errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.buildJobsRepo.save(buildJob);
      return false;
    }
  }

  private async resolveGradleInvocation(
    androidPath: string,
    gradlePath: string,
    args: string[],
  ): Promise<{ command: string; args: string[] }> {
    if (process.platform !== 'win32') {
      return { command: gradlePath, args };
    }

    return { command: gradlePath, args };
  }

  private async findBuiltDebugApk(
    mobileAppPath: string,
  ): Promise<string | null> {
    const candidates = [
      join(
        mobileAppPath,
        'build',
        'app',
        'outputs',
        'flutter-apk',
        'app-debug.apk',
      ),
      join(
        mobileAppPath,
        'build',
        'app',
        'outputs',
        'apk',
        'debug',
        'app-debug.apk',
      ),
      join(
        mobileAppPath,
        'android',
        'app',
        'build',
        'outputs',
        'apk',
        'debug',
        'app-debug.apk',
      ),
    ];
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // Try the next known Flutter/Gradle output location.
      }
    }
    return null;
  }

  private async findBuiltReleaseApk(
    mobileAppPath: string,
  ): Promise<string | null> {
    const candidates = [
      join(
        mobileAppPath,
        'build',
        'app',
        'outputs',
        'flutter-apk',
        'app-release.apk',
      ),
      join(
        mobileAppPath,
        'build',
        'app',
        'outputs',
        'apk',
        'release',
        'app-release.apk',
      ),
      join(
        mobileAppPath,
        'android',
        'app',
        'build',
        'outputs',
        'apk',
        'release',
        'app-release.apk',
      ),
      join(
        mobileAppPath,
        'build',
        'app',
        'outputs',
        'flutter-apk',
        'app-debug.apk',
      ),
      join(
        mobileAppPath,
        'build',
        'app',
        'outputs',
        'apk',
        'debug',
        'app-debug.apk',
      ),
      join(
        mobileAppPath,
        'android',
        'app',
        'build',
        'outputs',
        'apk',
        'debug',
        'app-debug.apk',
      ),
    ];
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // Try the next known Flutter/Gradle output location.
      }
    }
    return null;
  }

  private async findBuiltReleaseAab(
    mobileAppPath: string,
  ): Promise<string | null> {
    const candidates = [
      join(
        mobileAppPath,
        'build',
        'app',
        'outputs',
        'bundle',
        'release',
        'app-release.aab',
      ),
      join(
        mobileAppPath,
        'android',
        'app',
        'build',
        'outputs',
        'bundle',
        'release',
        'app-release.aab',
      ),
    ];
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // Try the next known Flutter/Gradle output location.
      }
    }
    return null;
  }

  private async injectLocalAndroidAppIdentity(
    mobileAppPath: string,
    buildJob: BuildJob,
    buildVersion: BuildVersion | null,
  ): Promise<void> {
    const pubspecPath = join(mobileAppPath, 'pubspec.yaml');
    await safeReplaceInFile(
      pubspecPath,
      /^name:\s*.*/m,
      `name: ${toDartPackageName(buildJob.appName)}`,
    );
    if (buildVersion) {
      await safeReplaceInFile(
        pubspecPath,
        /^version:\s*.*/m,
        `version: ${buildVersion.versionName}+${buildVersion.versionCode}`,
      );
      await writeFlutterLocalVersion(mobileAppPath, buildVersion);
    }

    const gradlePath = join(mobileAppPath, 'android', 'app', 'build.gradle');
    await safeReplaceInFile(
      gradlePath,
      /applicationId\s*=?\s*"[^"]+"/,
      `applicationId = "${buildJob.packageName}"`,
    );
    await safeReplaceInFile(
      gradlePath,
      /namespace\s*=?\s*"[^"]+"/,
      `namespace = "${buildJob.packageName}"`,
    );

    const manifestPath = join(
      mobileAppPath,
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    );
    await safeReplaceInFile(
      manifestPath,
      /android:label="[^"]+"/,
      `android:label="${escapeXmlAttribute(buildJob.appName)}"`,
    );
    await updateAndroidMainActivityPackage(mobileAppPath, buildJob.packageName);
  }

  private async injectLocalLauncherIcon(
    mobileAppPath: string,
    buildJob: BuildJob,
  ): Promise<void> {
    const [app, branding, settings] = await Promise.all([
      this.tenantAppsRepo.findOne({ where: { tenantId: buildJob.tenantId } }),
      this.brandingRepo.findOne({ where: { tenantId: buildJob.tenantId } }),
      this.tenantThemeSettingsRepo.findOne({
        where: { tenantId: buildJob.tenantId },
      }),
    ]);
    const selectedThemeId =
      buildJob.themeId ??
      settings?.mobileThemeId ??
      settings?.webThemeId ??
      null;
    const selectedTheme = selectedThemeId
      ? await this.themesRepo.findOne({ where: { id: selectedThemeId } })
      : null;
    const candidates = [
      app?.iconUrl,
      settings?.logoUrl,
      branding?.logoUrl,
      branding?.logoDataUrl,
      selectedTheme?.previewImage,
    ].filter(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    );

    for (const candidate of candidates) {
      const icon = await readPngIcon(candidate);
      if (!icon) continue;
      const resRoot = join(
        mobileAppPath,
        'android',
        'app',
        'src',
        'main',
        'res',
      );
      const densities = [
        'mipmap-mdpi',
        'mipmap-hdpi',
        'mipmap-xhdpi',
        'mipmap-xxhdpi',
        'mipmap-xxxhdpi',
      ];
      for (const density of densities) {
        const target = join(resRoot, density, 'ic_launcher.png');
        await fs.mkdir(dirname(target), { recursive: true });
        await fs.writeFile(target, icon);
      }
      return;
    }
  }

  private inferRepoRoot(): string {
    return process.cwd().endsWith('backend')
      ? join(process.cwd(), '..')
      : process.cwd();
  }

  private resolveFlutterCommand(): string {
    const configured =
      process.env.BUILD_FLUTTER_BIN?.trim() || process.env.FLUTTER_BIN?.trim();
    if (configured) {
      if (
        process.platform === 'win32' &&
        !/\.(?:bat|cmd|exe)$/i.test(configured)
      ) {
        return `${configured}.bat`;
      }
      return configured;
    }
    return process.platform === 'win32' ? 'flutter.bat' : 'flutter';
  }

  private resolveBuildGradleUserHome(): string {
    return (
      process.env.BUILD_GRADLE_USER_HOME?.trim() ||
      join(process.cwd(), 'storage', 'gradle-home')
    );
  }

  private localBuildTimeoutMs(): number {
    const raw = process.env.BUILD_LOCAL_TIMEOUT_MS?.trim();
    const parsed = raw ? Number(raw) : 20 * 60 * 1000;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 20 * 60 * 1000;
  }

  private shouldReuseLocalWorkspace(): boolean {
    const defaultValue = process.platform === 'win32' ? 'false' : 'true';
    return (
      (process.env.BUILD_LOCAL_REUSE_WORKSPACE ?? defaultValue)
        .trim()
        .toLowerCase() !== 'false'
    );
  }

  private localWorkspaceCacheKey(buildJob: BuildJob): string {
    return `${buildJob.tenantId}_${buildJob.buildType}_${buildJob.packageName}`
      .replace(/[^a-zA-Z0-9_.-]+/g, '_')
      .slice(0, 140);
  }

  private displayBuildType(buildType: BuildJob['buildType']): string {
    switch (buildType) {
      case 'ANDROID_AAB':
        return 'AAB';
      case 'ANDROID_APK':
        return 'APK';
      case 'IOS_IPA':
        return 'IPA';
      default:
        return buildType;
    }
  }

  private async commandExists(command: string): Promise<boolean> {
    try {
      await this.execCommand(command, ['--version'], process.cwd(), 20_000);
      return true;
    } catch {
      return false;
    }
  }

  private async execCommand(
    command: string,
    args: string[],
    cwd: string,
    timeoutMs = 0,
    env?: NodeJS.ProcessEnv,
  ): Promise<void> {
    if (this.shuttingDown) {
      throw new Error(
        'Local build interrupted because the application is shutting down.',
      );
    }
    const maxAttempts = process.platform === 'win32' ? 3 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          let child: ReturnType<typeof spawn>;
          try {
            child = spawnBuildCommand(command, args, cwd, env, [
              'ignore',
              'pipe',
              'pipe',
            ]);
            this.localBuildProcesses.add(child);
          } catch (error) {
            reject(toCommandError(command, args, error));
            return;
          }
          const timer = timeoutMs
            ? setTimeout(() => {
                if (settled) return;
                settled = true;
                this.localBuildProcesses.delete(child);
                killBuildProcess(child);
                reject(
                  new Error(
                    `${command} ${args.join(' ')} timed out after ${timeoutMs}ms`,
                  ),
                );
              }, timeoutMs)
            : null;
          let output = '';
          child.stdout?.on('data', (chunk) => {
            output += String(chunk);
          });
          child.stderr?.on('data', (chunk) => {
            output += String(chunk);
          });
          child.on('close', (code) => {
            this.localBuildProcesses.delete(child);
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            if (code === 0) resolve();
            else
              reject(
                new Error(
                  `${command} ${args.join(' ')} failed with exit code ${code ?? -1}: ${output.slice(-1200)}`,
                ),
              );
          });
          child.on('error', (error) => {
            this.localBuildProcesses.delete(child);
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            reject(toCommandError(command, args, error));
          });
        });
        return;
      } catch (error) {
        if (attempt === maxAttempts || !isRetryableCommandStartError(error)) {
          throw error;
        }
        await waitForCommandRetry(attempt);
      }
    }
  }
}

function killBuildProcess(child: ReturnType<typeof spawn>): void {
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    }).on('error', () => undefined);
    return;
  }
  child.kill('SIGTERM');
}

function toCommandError(
  command: string,
  args: string[],
  error: unknown,
): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(
    `Unable to start command "${command} ${args.join(' ')}": ${message}`,
  );
}

function isRetryableCommandStartError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b(?:EPERM|EACCES|EBUSY)\b/iu.test(message);
}

function waitForCommandRetry(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, attempt * 750));
}

function spawnBuildCommand(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv | undefined,
  stdio: ['ignore', 'pipe', 'pipe'] | 'ignore',
): ReturnType<typeof spawn> {
  if (process.platform !== 'win32') {
    return spawn(command, args, { cwd, env, stdio, shell: false });
  }

  if (!/\.(bat|cmd)$/iu.test(command)) {
    return spawn(command, args, {
      cwd,
      env,
      stdio,
      shell: false,
      windowsHide: true,
    });
  }

  return spawn('cmd.exe', ['/d', '/c', 'call', command, ...args], {
    cwd,
    env,
    stdio,
    shell: false,
    windowsHide: true,
  });
}

async function safeReplaceInFile(
  path: string,
  pattern: RegExp,
  replacement: string,
) {
  try {
    const content = await fs.readFile(path, 'utf8');
    const next = content.match(pattern)
      ? content.replace(pattern, replacement)
      : content;
    await fs.writeFile(path, next, 'utf8');
  } catch {
    // Local template variants may not include every Android file.
  }
}

async function writeFlutterLocalVersion(
  mobileAppPath: string,
  buildVersion: BuildVersion,
): Promise<void> {
  const localPropertiesPath = join(
    mobileAppPath,
    'android',
    'local.properties',
  );
  let content = '';
  try {
    content = await fs.readFile(localPropertiesPath, 'utf8');
  } catch {
    // Flutter can regenerate this file, but Gradle fallback reads it when present.
  }

  const lines = content
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0);
  const next = upsertProperties(lines, {
    'flutter.versionName': buildVersion.versionName,
    'flutter.versionCode': String(buildVersion.versionCode),
  });
  await fs.writeFile(localPropertiesPath, `${next.join('\n')}\n`, 'utf8');
}

function upsertProperties(
  lines: string[],
  values: Record<string, string>,
): string[] {
  const pending = new Map(Object.entries(values));
  const next = lines.map((line) => {
    const key = line.split('=')[0]?.trim();
    if (!key || !pending.has(key)) return line;
    const value = pending.get(key)!;
    pending.delete(key);
    return `${key}=${value}`;
  });
  for (const [key, value] of pending) next.push(`${key}=${value}`);
  return next;
}

function buildVersionArgs(buildVersion: BuildVersion | null): string[] {
  if (!buildVersion) return [];
  return [
    `--build-name=${buildVersion.versionName}`,
    `--build-number=${buildVersion.versionCode}`,
  ];
}

function shouldCopyMobileTemplatePath(
  templateSource: string,
  src: string,
): boolean {
  const rel = relative(resolve(templateSource), resolve(src)).replace(
    /\\/g,
    '/',
  );
  if (!rel) return true;
  if (rel.startsWith('..') || /^[a-z]:/iu.test(rel)) return false;
  const parts = rel.split('/');
  return !parts.some((part) =>
    [
      'build',
      '.dart_tool',
      '.gradle',
      '.git',
      '.plugin_symlinks',
      'node_modules',
      'Pods',
      'ephemeral',
    ].includes(part),
  );
}

async function updateAndroidMainActivityPackage(
  mobileAppPath: string,
  packageName: string,
): Promise<void> {
  const androidMainPath = join(mobileAppPath, 'android', 'app', 'src', 'main');
  const activity = await findFirstFile(androidMainPath, [
    'MainActivity.kt',
    'MainActivity.java',
  ]);
  if (!activity) return;
  const content = await fs.readFile(activity, 'utf8');
  const next = content.match(/^package\s+[\w.]+/m)
    ? content.replace(/^package\s+[\w.]+/m, `package ${packageName}`)
    : `package ${packageName}\n\n${content}`;
  await fs.writeFile(activity, next, 'utf8');
}

async function findFirstFile(
  root: string,
  fileNames: string[],
): Promise<string | null> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isFile() && fileNames.includes(entry.name)) return path;
    if (entry.isDirectory()) {
      const found = await findFirstFile(path, fileNames);
      if (found) return found;
    }
  }
  return null;
}

function escapeXmlAttribute(input: string): string {
  return String(input || 'White Label App')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toBase64Utf8(input: string): string {
  return Buffer.from(input || '', 'utf8').toString('base64');
}

function toDartPackageName(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'mobile_app';
}

async function readPngIcon(rawSource: string): Promise<Buffer | null> {
  const source = rawSource.trim();
  let bytes: Buffer | null = null;
  if (source.startsWith('data:')) {
    bytes = decodeDataUrl(source);
  } else if (/^https?:\/\//i.test(source)) {
    bytes = await downloadBytes(source);
  } else {
    bytes = await readLocalStorageBytes(source);
  }
  if (!bytes) return null;
  if (isPng(bytes)) return bytes;
  if (isJpeg(bytes)) return jpegToPng(bytes);
  return null;
}

function decodeDataUrl(source: string): Buffer | null {
  const match = source.match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i);
  if (!match?.[1]) return null;
  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
}

async function readLocalStorageBytes(source: string): Promise<Buffer | null> {
  const normalized = source.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized.startsWith('storage/')) return null;
  try {
    return await fs.readFile(join(process.cwd(), normalized));
  } catch {
    return null;
  }
}

async function downloadBytes(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function isPng(bytes: Buffer): boolean {
  return (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isJpeg(bytes: Buffer): boolean {
  return (
    bytes.length > 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9
  );
}

function jpegToPng(bytes: Buffer): Buffer | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jpeg = require('jpeg-js') as {
      decode(
        input: Buffer,
        opts?: { useTArray?: boolean },
      ): { width: number; height: number; data: Buffer };
    };
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PNG } = require('pngjs') as {
      PNG: {
        sync: {
          write(input: { width: number; height: number; data: Buffer }): Buffer;
        };
      };
    };
    const decoded = jpeg.decode(bytes, { useTArray: true });
    return PNG.sync.write({
      width: decoded.width,
      height: decoded.height,
      data: Buffer.from(decoded.data),
    });
  } catch {
    return null;
  }
}
