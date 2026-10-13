import { Worker } from 'bullmq';
import { promises as fs } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { spawn } from 'child_process';
import { DataSource, Repository } from 'typeorm';
import { AppVersion } from '../common/entities/app-version.entity';
import { BuildArtifact } from '../common/entities/build-artifact.entity';
import { BuildJob } from '../common/entities/build-job.entity';
import { BuildLog } from '../common/entities/build-log.entity';
import { BuildMetric } from '../common/entities/build-metric.entity';
import { SystemConfig } from '../common/entities/system-config.entity';
import { TenantBranding } from '../common/entities/tenant-branding.entity';
import { TenantDistributorApp } from '../common/entities/tenant-app.entity';
import { TenantThemeSettings } from '../common/entities/tenant-theme-settings.entity';
import { Theme } from '../common/entities/theme.entity';
import {
  BuildVersion,
  getReservedBuildVersion,
  markReservedBuildVersionFinished,
  markReservedBuildVersionStarted,
} from '../build-system/app-build-versioning';
import {
  prepareMobileLocalizationAssets,
  validateMobileLocalizationAssetsInArtifact,
} from '../build-system/mobile-localization-assets';
import { mobileBuildNetworkDartDefines } from '../build-system/mobile-build-runtime-config';
import {
  normalizeLauncherIcon,
  writeAndroidLauncherIcons,
} from '../build-system/mobile-launcher-icon';
import {
  prepareMobileThemeAssets,
  validateMobileThemeAssetsInArtifact,
} from '../build-system/mobile-theme-assets';
import { logFailedJob, logWorkerEvent } from './worker-log.util';
import { QUEUE_NAMES } from './queues';

export const createBuildWorker = (
  connection: { host: string; port: number },
  ds: DataSource,
) =>
  new Worker(
    QUEUE_NAMES.build,
    async (job) => {
      const eventType = job.name;
      const buildJobsRepo = ds.getRepository(BuildJob);
      const artifactsRepo = ds.getRepository(BuildArtifact);
      const appVersionsRepo = ds.getRepository(AppVersion);
      const buildLogsRepo = ds.getRepository(BuildLog);
      const buildMetricsRepo = ds.getRepository(BuildMetric);
      const systemConfigRepo = ds.getRepository(SystemConfig);
      const tenantAppsRepo = ds.getRepository(TenantDistributorApp);
      const tenantBrandingRepo = ds.getRepository(TenantBranding);
      const tenantThemeSettingsRepo = ds.getRepository(TenantThemeSettings);
      const themesRepo = ds.getRepository(Theme);
      const buildJobId = String(job.data.buildJobId ?? '');
      const workspaceRoot = join(
        process.env.BUILD_WORKSPACE_ROOT ?? join(process.cwd(), 'workspace'),
        `job_${buildJobId}`,
      );

      try {
        const buildJob = await buildJobsRepo.findOne({
          where: { id: buildJobId },
        });
        if (!buildJob) throw new Error('Build job not found.');

        const queueWaitMs = Date.now() - buildJob.createdAt.getTime();
        buildJob.status = 'RUNNING';
        buildJob.startedAt = new Date();
        buildJob.errorMessage = null;
        await buildJobsRepo.save(buildJob);
        await markReservedBuildVersionStarted(appVersionsRepo, buildJob);
        if (buildJob.buildType === 'ANDROID_APK') {
          await tenantAppsRepo.update(
            { tenantId: buildJob.tenantId },
            { status: 'building' },
          );
        }

        await thisLog(buildLogsRepo, buildJob.id, 'INFO', 'Build started');
        await fs.rm(workspaceRoot, { recursive: true, force: true });
        await fs.mkdir(workspaceRoot, { recursive: true });
        await thisLog(
          buildLogsRepo,
          buildJob.id,
          'INFO',
          `Workspace prepared: ${workspaceRoot}`,
        );

        const repoRoot = process.env.BUILD_REPO_ROOT ?? inferRepoRoot();
        const templateSource =
          process.env.BUILD_MOBILE_TEMPLATE_PATH ??
          join(repoRoot, 'tenant-apps', 'mobile-app');
        const templateTarget = join(workspaceRoot, 'mobile-template');
        await ensurePathExists(
          templateSource,
          `Mobile template missing at ${templateSource}`,
        );
        await fs.cp(templateSource, templateTarget, {
          recursive: true,
          filter: (src) => shouldCopyMobileTemplatePath(templateSource, src),
        });
        await thisLog(
          buildLogsRepo,
          buildJob.id,
          'INFO',
          `Template copied from ${templateSource}`,
        );

        const buildVersion = await getReservedBuildVersion(
          appVersionsRepo,
          buildJob,
        );
        if (buildVersion) {
          await thisLog(
            buildLogsRepo,
            buildJob.id,
            'INFO',
            `App version bumped to ${buildVersion.versionName}+${buildVersion.versionCode}`,
          );
        }

        const tenantConfig = {
          tenant_id: buildJob.tenantId,
          app_name: buildJob.appName,
          package_name: buildJob.packageName,
          theme: buildJob.themeId ?? 'default',
          languages: buildJob.languages,
        };
        await fs.writeFile(
          join(workspaceRoot, 'tenant_config.json'),
          JSON.stringify(tenantConfig, null, 2),
        );
        await thisLog(
          buildLogsRepo,
          buildJob.id,
          'INFO',
          'tenant_config.json generated',
        );

        await injectConfigAndPackageUpdates(
          templateTarget,
          buildJob,
          buildLogsRepo,
          buildVersion,
        );
        await injectLauncherIcon(
          templateTarget,
          buildJob,
          tenantAppsRepo,
          tenantBrandingRepo,
          tenantThemeSettingsRepo,
          themesRepo,
          buildLogsRepo,
        );
        await injectGradleBuildStabilitySettings(
          templateTarget,
          buildJob,
          buildLogsRepo,
        );
        await injectFirebaseConfig(
          templateTarget,
          buildJob,
          systemConfigRepo,
          buildLogsRepo,
        );

        const selectedTheme = buildJob.themeId
          ? await themesRepo.findOne({ where: { id: buildJob.themeId } })
          : null;
        const localizationAssets =
          buildJob.buildType === 'ANDROID_APK' ||
          buildJob.buildType === 'ANDROID_AAB' ||
          buildJob.buildType === 'IOS_IPA'
            ? await prepareMobileLocalizationAssets({
                mobileAppPath: templateTarget,
                repoRoot,
                selectedTheme,
                languages: buildJob.languages,
                log: (message) =>
                  thisLog(buildLogsRepo, buildJob.id, 'INFO', message),
              })
            : [];
        const themeAssets =
          buildJob.buildType === 'ANDROID_APK' ||
          buildJob.buildType === 'ANDROID_AAB' ||
          buildJob.buildType === 'IOS_IPA'
            ? await prepareMobileThemeAssets({
                mobileAppPath: templateTarget,
                repoRoot,
                selectedTheme,
                language: buildJob.languages?.[0],
                log: (message) =>
                  thisLog(buildLogsRepo, buildJob.id, 'INFO', message),
              })
            : [];

        const buildStart = Date.now();
        await thisLog(
          buildLogsRepo,
          buildJob.id,
          'INFO',
          '[BUILD] Starting mobile build...',
        );
        const { artifacts: builtArtifacts } = await runBuildCommand(
          templateTarget,
          buildJob,
          buildLogsRepo,
          buildVersion,
        );
        const buildDurationMs = Date.now() - buildStart;
        if (localizationAssets.length) {
          for (const builtArtifact of builtArtifacts) {
            await validateMobileLocalizationAssetsInArtifact({
              artifactPath: builtArtifact.artifactLocalPath,
              expectedAssets: localizationAssets,
              log: (message) =>
                thisLog(buildLogsRepo, buildJob.id, 'INFO', message),
            });
          }
        }
        if (themeAssets.length) {
          for (const builtArtifact of builtArtifacts) {
            await validateMobileThemeAssetsInArtifact({
              artifactPath: builtArtifact.artifactLocalPath,
              expectedAssets: themeAssets,
              log: (message) =>
                thisLog(buildLogsRepo, buildJob.id, 'INFO', message),
            });
          }
        }

        const artifactsRoot =
          process.env.BUILD_ARTIFACTS_ROOT ??
          join('storage', 'build-artifacts');
        await fs.mkdir(
          join(process.cwd(), artifactsRoot, `tenant_${buildJob.tenantId}`),
          {
            recursive: true,
          },
        );
        const primaryArtifactType: BuildArtifact['artifactType'] =
          buildJob.buildType === 'ANDROID_AAB'
            ? 'AAB'
            : buildJob.buildType === 'IOS_IPA'
              ? 'IPA'
              : buildJob.buildType === 'ANDROID_APK'
                ? 'APK'
                : 'WEB_BUNDLE';
        let primaryArtifactId: string | null = null;
        let totalArtifactSize = 0;
        for (const builtArtifact of builtArtifacts) {
          const fileName = `${buildJob.id}-${extractArtifactName(builtArtifact.artifactLocalPath)}`;
          const artifactRelativePath = join(
            artifactsRoot,
            `tenant_${buildJob.tenantId}`,
            fileName,
          );
          const artifactPath = join(process.cwd(), artifactRelativePath);
          await fs.copyFile(builtArtifact.artifactLocalPath, artifactPath);
          const stat = await fs.stat(artifactPath);
          totalArtifactSize += stat.size;
          await thisLog(
            buildLogsRepo,
            buildJob.id,
            'INFO',
            `${builtArtifact.artifactType} stored at ${artifactRelativePath}`,
          );

          const savedArtifact = await artifactsRepo.save(
            artifactsRepo.create({
              buildJobId: buildJob.id,
              artifactType: builtArtifact.artifactType,
              filePath: artifactRelativePath,
              fileSize: String(stat.size),
              versionCode: buildVersion?.versionCode ?? null,
              versionName: buildVersion?.versionName ?? null,
            }),
          );
          if (builtArtifact.artifactType === primaryArtifactType) {
            primaryArtifactId = savedArtifact.id;
          }
        }
        if (!primaryArtifactId) {
          throw new Error(
            `Primary ${primaryArtifactType} artifact was not produced.`,
          );
        }

        if (buildVersion) {
          await markReservedBuildVersionFinished(
            appVersionsRepo,
            buildJob,
            'SUCCESS',
            primaryArtifactId,
          );
        }

        buildJob.status = 'SUCCESS';
        buildJob.completedAt = new Date();
        await buildJobsRepo.save(buildJob);
        if (buildJob.buildType === 'ANDROID_APK') {
          await tenantAppsRepo.update(
            { tenantId: buildJob.tenantId },
            { status: 'ready' },
          );
        }
        await buildMetricsRepo.save(
          buildMetricsRepo.create({
            buildJobId: buildJob.id,
            queueWaitTimeMs: queueWaitMs,
            buildDurationMs,
            artifactSizeBytes: String(totalArtifactSize),
          }),
        );
        await thisLog(
          buildLogsRepo,
          buildJob.id,
          'INFO',
          'Build completed successfully',
        );
        await cleanupWorkspace(workspaceRoot, buildLogsRepo, buildJob.id);

        await logWorkerEvent(ds, 'build_worker', eventType, 'SUCCESS');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        if (buildJobId) {
          const buildJob = await buildJobsRepo.findOne({
            where: { id: buildJobId },
          });
          if (buildJob) {
            buildJob.status = 'FAILED';
            buildJob.errorMessage = errorMessage;
            buildJob.completedAt = new Date();
            await buildJobsRepo.save(buildJob);
            await markReservedBuildVersionFinished(
              appVersionsRepo,
              buildJob,
              'FAILED',
            );
            if (buildJob.buildType === 'ANDROID_APK') {
              await tenantAppsRepo.update(
                { tenantId: buildJob.tenantId },
                { status: 'failed' },
              );
            }
          }
        }
        await thisLog(buildLogsRepo, buildJobId, 'ERROR', errorMessage);
        await cleanupWorkspace(workspaceRoot, buildLogsRepo, buildJobId);
        await logWorkerEvent(
          ds,
          'build_worker',
          eventType,
          'FAILED',
          errorMessage,
        );
        await logFailedJob(
          ds,
          'build_worker',
          QUEUE_NAMES.build,
          eventType,
          job.data as Record<string, unknown>,
          errorMessage,
        );
        throw error;
      }
    },
    { connection, concurrency: 2 },
  );

async function cleanupWorkspace(
  workspaceRoot: string,
  logsRepo: Repository<BuildLog>,
  buildJobId: string,
) {
  try {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown cleanup error';
    await thisLog(
      logsRepo,
      buildJobId,
      'WARN',
      `Workspace cleanup skipped: ${message}`,
    );
  }
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

async function thisLog(
  repo: Repository<BuildLog>,
  buildJobId: string,
  level: 'INFO' | 'WARN' | 'ERROR',
  message: string,
) {
  await repo.save(
    repo.create({
      buildJobId,
      logLevel: level,
      logOutput: message,
    }),
  );
}

async function ensurePathExists(path: string, errorMessage: string) {
  try {
    await fs.access(path);
  } catch {
    throw new Error(errorMessage);
  }
}

async function writeFlutterLocalVersion(
  templateTarget: string,
  buildVersion: BuildVersion,
): Promise<void> {
  const localPropertiesPath = join(
    templateTarget,
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

async function injectConfigAndPackageUpdates(
  templateTarget: string,
  buildJob: BuildJob,
  logsRepo: Repository<BuildLog>,
  buildVersion: BuildVersion | null,
) {
  const pubspecPath = join(templateTarget, 'pubspec.yaml');
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
    await writeFlutterLocalVersion(templateTarget, buildVersion);
  }

  const gradlePath = join(templateTarget, 'android', 'app', 'build.gradle');
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
    templateTarget,
    'android',
    'app',
    'src',
    'main',
    'AndroidManifest.xml',
  );
  await safeReplaceInFile(
    manifestPath,
    /package="[^"]+"/,
    `package="${buildJob.packageName}"`,
  );
  await safeReplaceInFile(
    manifestPath,
    /android:label="[^"]+"/,
    `android:label="${escapeXmlAttribute(buildJob.appName)}"`,
  );

  await updateAndroidMainActivityPackage(templateTarget, buildJob.packageName);
  await injectIosConfigAndPackageUpdates(
    templateTarget,
    buildJob,
    buildVersion,
  );
  await thisLog(
    logsRepo,
    buildJob.id,
    'INFO',
    'Package and app config updated',
  );
}

async function injectIosConfigAndPackageUpdates(
  templateTarget: string,
  buildJob: BuildJob,
  buildVersion: BuildVersion | null,
) {
  if (buildJob.buildType !== 'IOS_IPA') return;
  const plistPath = join(templateTarget, 'ios', 'Runner', 'Info.plist');
  await safeReplaceInFile(
    plistPath,
    /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
    `<key>CFBundleDisplayName</key>\n\t<string>${escapeXmlAttribute(buildJob.appName)}</string>`,
  );
  const pbxprojPath = join(
    templateTarget,
    'ios',
    'Runner.xcodeproj',
    'project.pbxproj',
  );
  await safeReplaceInFile(
    pbxprojPath,
    /PRODUCT_BUNDLE_IDENTIFIER = (?![^;]*RunnerTests)[^;]+;/g,
    `PRODUCT_BUNDLE_IDENTIFIER = ${buildJob.packageName};`,
  );
  if (!buildVersion) return;
  await safeReplaceInFile(
    pbxprojPath,
    /CURRENT_PROJECT_VERSION = [^;]+;/g,
    `CURRENT_PROJECT_VERSION = ${buildVersion.versionCode};`,
  );
  await safeReplaceInFile(
    pbxprojPath,
    /MARKETING_VERSION = [^;]+;/g,
    `MARKETING_VERSION = ${buildVersion.versionName};`,
  );
}

async function injectLauncherIcon(
  templateTarget: string,
  buildJob: BuildJob,
  tenantAppsRepo: Repository<TenantDistributorApp>,
  brandingRepo: Repository<TenantBranding>,
  tenantThemeSettingsRepo: Repository<TenantThemeSettings>,
  themesRepo: Repository<Theme>,
  logsRepo: Repository<BuildLog>,
) {
  if (
    buildJob.buildType !== 'ANDROID_APK' &&
    buildJob.buildType !== 'ANDROID_AAB'
  )
    return;

  const [app, branding, settings] = await Promise.all([
    tenantAppsRepo.findOne({ where: { tenantId: buildJob.tenantId } }),
    brandingRepo.findOne({ where: { tenantId: buildJob.tenantId } }),
    tenantThemeSettingsRepo.findOne({ where: { tenantId: buildJob.tenantId } }),
  ]);
  const selectedThemeId =
    buildJob.themeId ?? settings?.mobileThemeId ?? settings?.webThemeId ?? null;
  const selectedTheme = selectedThemeId
    ? await themesRepo.findOne({ where: { id: selectedThemeId } })
    : null;

  const candidates = [
    branding?.logoUrl,
    branding?.logoDataUrl,
    settings?.logoUrl,
    app?.iconUrl,
    selectedTheme?.previewImage,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  if (!candidates.length) {
    await thisLog(
      logsRepo,
      buildJob.id,
      'INFO',
      'No tenant app icon/logo found; default launcher icon kept',
    );
    return;
  }

  for (const candidate of candidates) {
    const icon = await readPngIcon(candidate, buildJob.id, logsRepo);
    if (!icon) continue;

    const resRoot = join(
      templateTarget,
      'android',
      'app',
      'src',
      'main',
      'res',
    );
    await writeAndroidLauncherIcons(resRoot, icon);
    await thisLog(
      logsRepo,
      buildJob.id,
      'INFO',
      'Tenant launcher icon injected from branding',
    );
    return;
  }

  await thisLog(
    logsRepo,
    buildJob.id,
    'WARN',
    'Tenant icon/logo/theme preview was found but not usable as PNG; default launcher icon kept',
  );
}

async function readPngIcon(
  rawSource: string,
  buildJobId: string,
  logsRepo: Repository<BuildLog>,
): Promise<Buffer | null> {
  const source = rawSource.trim();
  let bytes: Buffer | null = null;

  if (source.startsWith('data:')) {
    bytes = decodeDataUrl(source);
  } else if (/^https?:\/\//i.test(source)) {
    bytes = await downloadPng(source, buildJobId, logsRepo);
  } else {
    bytes = await readLocalStoragePng(source);
  }

  if (!bytes) return null;
  return normalizeLauncherIcon(bytes);
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

async function readLocalStoragePng(source: string): Promise<Buffer | null> {
  const normalized = source.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized.startsWith('storage/')) return null;
  try {
    return await fs.readFile(join(process.cwd(), normalized));
  } catch {
    return null;
  }
}

async function downloadPng(
  url: string,
  buildJobId: string,
  logsRepo: Repository<BuildLog>,
): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      await thisLog(
        logsRepo,
        buildJobId,
        'WARN',
        `Icon download failed (${res.status}): ${url}`,
      );
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    await thisLog(
      logsRepo,
      buildJobId,
      'WARN',
      `Icon download failed: ${message}`,
    );
    return null;
  }
}

async function updateAndroidMainActivityPackage(
  templateTarget: string,
  packageName: string,
) {
  const androidMainPath = join(templateTarget, 'android', 'app', 'src', 'main');
  const activity = await findFirstFile(androidMainPath, [
    'MainActivity.kt',
    'MainActivity.java',
  ]);
  if (!activity) return;

  const content = await fs.readFile(activity, 'utf8');
  const nextContent = content.match(/^package\s+[\w.]+/m)
    ? content.replace(/^package\s+[\w.]+/m, `package ${packageName}`)
    : `package ${packageName}\n\n${content}`;

  const sourceRoot = activity.includes(`${join(androidMainPath, 'java')}`)
    ? join(androidMainPath, 'java')
    : join(androidMainPath, 'kotlin');
  const targetPath = join(
    sourceRoot,
    ...packageName.split('.'),
    activity.endsWith('.java') ? 'MainActivity.java' : 'MainActivity.kt',
  );

  await fs.mkdir(dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, nextContent, 'utf8');
  if (activity !== targetPath) {
    await fs.rm(activity, { force: true });
  }
}

async function findFirstFile(
  root: string,
  fileNames: string[],
): Promise<string | null> {
  let entries: import('fs').Dirent[];
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

async function injectFirebaseConfig(
  templateTarget: string,
  buildJob: BuildJob,
  configRepo: Repository<SystemConfig>,
  logsRepo: Repository<BuildLog>,
) {
  if (buildJob.buildType === 'WEB') return;

  const key = `tenant:${buildJob.tenantId}:google_services_json`;
  const row = await configRepo.findOne({ where: { key } });
  if (!row?.value) {
    await thisLog(
      logsRepo,
      buildJob.id,
      'WARN',
      `Missing firebase config in system_config key: ${key}; skipping google-services.json injection`,
    );
    return;
  }
  const googleServicesPath = join(
    templateTarget,
    'android',
    'app',
    'google-services.json',
  );
  await fs.writeFile(googleServicesPath, row.value, 'utf8');
  await thisLog(logsRepo, buildJob.id, 'INFO', 'google-services.json injected');
}

async function injectGradleBuildStabilitySettings(
  templateTarget: string,
  buildJob: BuildJob,
  logsRepo: Repository<BuildLog>,
) {
  const gradlePropertiesPath = join(
    templateTarget,
    'android',
    'gradle.properties',
  );
  const settings = [
    'kotlin.incremental=false',
    'kotlin.compiler.execution.strategy=in-process',
    'org.gradle.daemon=false',
  ];

  let content = '';
  try {
    content = await fs.readFile(gradlePropertiesPath, 'utf8');
  } catch {
    // Optional in Flutter variants; create it when missing.
  }

  const lines = content
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0);
  const existingKeys = new Set(
    lines.map((line) => line.split('=')[0]?.trim()).filter(Boolean),
  );
  for (const setting of settings) {
    const key = setting.split('=')[0];
    if (!existingKeys.has(key)) lines.push(setting);
  }
  await fs.writeFile(gradlePropertiesPath, `${lines.join('\n')}\n`, 'utf8');
  await thisLog(
    logsRepo,
    buildJob.id,
    'INFO',
    'Gradle stability settings injected',
  );
}

async function runBuildCommand(
  templateTarget: string,
  buildJob: BuildJob,
  logsRepo: Repository<BuildLog>,
  buildVersion: BuildVersion | null,
): Promise<{
  artifacts: Array<{
    artifactLocalPath: string;
    artifactType: BuildArtifact['artifactType'];
  }>;
}> {
  if (buildJob.buildType === 'ANDROID_APK') {
    const apkPath = await runAndroidApkBuild(
      templateTarget,
      buildJob,
      logsRepo,
      buildVersion,
    );
    const aabPath = await runAndroidAabBuild(
      templateTarget,
      buildJob,
      logsRepo,
      buildVersion,
    );
    return {
      artifacts: [
        { artifactLocalPath: apkPath, artifactType: 'APK' },
        { artifactLocalPath: aabPath, artifactType: 'AAB' },
      ],
    };
  }
  if (buildJob.buildType === 'IOS_IPA') {
    const ipaPath = await runIosIpaBuild(
      templateTarget,
      buildJob,
      logsRepo,
      buildVersion,
    );
    return { artifacts: [{ artifactLocalPath: ipaPath, artifactType: 'IPA' }] };
  }

  const flutterCommand = resolveFlutterCommand();
  const flutterAvailable = await commandExists(flutterCommand);
  if (!flutterAvailable) {
    throw new Error(
      `Flutter CLI is not available on worker host (${flutterCommand}).`,
    );
  }
  await execCommand(flutterCommand, ['pub', 'get'], templateTarget, (line) =>
    thisLog(logsRepo, buildJob.id, 'INFO', line),
  );

  const dartDefines = [
    `--dart-define=TENANT_ID=${buildJob.tenantId}`,
    `--dart-define=TENANT=${buildJob.tenantId}`,
    `--dart-define=THEME_ID=${buildJob.themeId ?? ''}`,
    `--dart-define=APP_NAME_B64=${toBase64Utf8(buildJob.appName)}`,
    `--dart-define=APP_LANGUAGE=${encodeURIComponent(buildJob.languages?.[0] ?? 'en')}`,
    '--dart-define=LANGUAGE_CONSISTENCY_ENABLED=true',
    ...mobileBuildNetworkDartDefines().map((value) => `--dart-define=${value}`),
  ];

  const args =
    buildJob.buildType === 'ANDROID_AAB'
      ? [
          'build',
          'appbundle',
          '--release',
          ...buildVersionArgs(buildVersion),
          ...dartDefines,
        ]
      : ['build', 'web', '--release', ...dartDefines];

  await execCommand(flutterCommand, args, templateTarget, (line) =>
    thisLog(logsRepo, buildJob.id, 'INFO', line),
  );

  const artifactLocalPath =
    buildJob.buildType === 'ANDROID_AAB'
      ? join(
          templateTarget,
          'build',
          'app',
          'outputs',
          'bundle',
          'release',
          'app-release.aab',
        )
      : join(templateTarget, 'build', 'web', 'index.html');

  await ensurePathExists(
    artifactLocalPath,
    `Build output not found: ${artifactLocalPath}`,
  );
  return {
    artifacts: [
      {
        artifactLocalPath,
        artifactType:
          buildJob.buildType === 'ANDROID_AAB' ? 'AAB' : 'WEB_BUNDLE',
      },
    ],
  };
}

async function runIosIpaBuild(
  templateTarget: string,
  buildJob: BuildJob,
  logsRepo: Repository<BuildLog>,
  buildVersion: BuildVersion | null,
): Promise<string> {
  if (process.platform === 'win32') {
    throw new Error(
      'iOS IPA builds require a macOS worker with Xcode and Flutter installed.',
    );
  }
  const flutterCommand = resolveFlutterCommand();
  const flutterAvailable = await commandExists(flutterCommand);
  if (!flutterAvailable) {
    throw new Error(
      `Flutter CLI is not available on worker host (${flutterCommand}).`,
    );
  }

  const dartDefines = buildDartDefines(buildJob).map(
    (value) => `--dart-define=${value}`,
  );
  await execCommand(
    flutterCommand,
    ['pub', 'get'],
    templateTarget,
    (line) => thisLog(logsRepo, buildJob.id, 'INFO', line),
    5 * 60 * 1000,
  );
  await execCommand(
    flutterCommand,
    [
      'build',
      'ipa',
      '--release',
      ...buildVersionArgs(buildVersion),
      ...dartDefines,
    ],
    templateTarget,
    (line) => thisLog(logsRepo, buildJob.id, 'INFO', line),
    20 * 60 * 1000,
  );

  const ipaPath = await findFirstFile(
    join(templateTarget, 'build', 'ios', 'ipa'),
    ['Runner.ipa'],
  );
  if (!ipaPath) {
    throw new Error('Build output not found: build/ios/ipa/*.ipa');
  }
  return ipaPath;
}

async function runAndroidApkBuild(
  templateTarget: string,
  buildJob: BuildJob,
  logsRepo: Repository<BuildLog>,
  buildVersion: BuildVersion | null,
): Promise<string> {
  const flutterCommand = resolveFlutterCommand();
  const flutterAvailable = await commandExists(flutterCommand);
  const dartDefines = buildDartDefines(buildJob);
  const gradleUserHome = resolveBuildGradleUserHome();
  await fs.mkdir(gradleUserHome, { recursive: true });
  const buildEnv = {
    ...process.env,
    GRADLE_USER_HOME: gradleUserHome,
  };

  if (flutterAvailable) {
    try {
      await thisLog(
        logsRepo,
        buildJob.id,
        `INFO`,
        `Building APK with Flutter CLI: ${flutterCommand}`,
      );
      await execCommand(
        flutterCommand,
        ['pub', 'get'],
        templateTarget,
        (line) => thisLog(logsRepo, buildJob.id, 'INFO', line),
        5 * 60 * 1000,
        buildEnv,
      );
      await execCommand(
        flutterCommand,
        [
          'build',
          'apk',
          '--release',
          ...buildVersionArgs(buildVersion),
          ...dartDefines.map((value) => `--dart-define=${value}`),
        ],
        templateTarget,
        (line) => thisLog(logsRepo, buildJob.id, 'INFO', line),
        10 * 60 * 1000,
        buildEnv,
      );
      const flutterApk = await findBuiltReleaseApk(templateTarget);
      if (!flutterApk) {
        throw new Error('Build output not found: app-release.apk');
      }
      await ensurePathExists(
        flutterApk,
        `Build output not found: ${flutterApk}`,
      );
      return flutterApk;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await thisLog(
        logsRepo,
        buildJob.id,
        'WARN',
        `Flutter APK build failed; falling back to Gradle wrapper: ${message}`,
      );
    }
  } else {
    await thisLog(
      logsRepo,
      buildJob.id,
      'WARN',
      `Flutter CLI is not available/responding (${flutterCommand}); using Gradle wrapper fallback`,
    );
  }

  return runAndroidApkBuildWithGradle(
    templateTarget,
    buildJob,
    logsRepo,
    dartDefines,
  );
}

async function runAndroidAabBuild(
  templateTarget: string,
  buildJob: BuildJob,
  logsRepo: Repository<BuildLog>,
  buildVersion: BuildVersion | null,
): Promise<string> {
  const flutterCommand = resolveFlutterCommand();
  const flutterAvailable = await commandExists(flutterCommand);
  const dartDefines = buildDartDefines(buildJob);
  const gradleUserHome = resolveBuildGradleUserHome();
  await fs.mkdir(gradleUserHome, { recursive: true });
  const buildEnv = {
    ...process.env,
    GRADLE_USER_HOME: gradleUserHome,
  };

  if (flutterAvailable) {
    try {
      await thisLog(
        logsRepo,
        buildJob.id,
        'INFO',
        `Building companion AAB with Flutter CLI: ${flutterCommand}`,
      );
      await execCommand(
        flutterCommand,
        [
          'build',
          'appbundle',
          '--release',
          ...buildVersionArgs(buildVersion),
          ...dartDefines.map((value) => `--dart-define=${value}`),
        ],
        templateTarget,
        (line) => thisLog(logsRepo, buildJob.id, 'INFO', line),
        10 * 60 * 1000,
        buildEnv,
      );
      const flutterAab = await findBuiltReleaseAab(templateTarget);
      if (!flutterAab) {
        throw new Error('Build output not found: app-release.aab');
      }
      await ensurePathExists(
        flutterAab,
        `Build output not found: ${flutterAab}`,
      );
      return flutterAab;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await thisLog(
        logsRepo,
        buildJob.id,
        'WARN',
        `Flutter AAB build failed; falling back to Gradle wrapper: ${message}`,
      );
    }
  } else {
    await thisLog(
      logsRepo,
      buildJob.id,
      'WARN',
      `Flutter CLI is not available/responding (${flutterCommand}); using Gradle wrapper fallback for AAB`,
    );
  }

  return runAndroidAabBuildWithGradle(
    templateTarget,
    buildJob,
    logsRepo,
    dartDefines,
  );
}

function buildVersionArgs(buildVersion: BuildVersion | null): string[] {
  if (!buildVersion) return [];
  return [
    `--build-name=${buildVersion.versionName}`,
    `--build-number=${buildVersion.versionCode}`,
  ];
}

async function runAndroidApkBuildWithGradle(
  templateTarget: string,
  buildJob: BuildJob,
  logsRepo: Repository<BuildLog>,
  dartDefines: string[],
): Promise<string> {
  const androidPath = join(templateTarget, 'android');
  const gradleCommand =
    process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const gradlePath = join(androidPath, gradleCommand);
  await ensurePathExists(
    gradlePath,
    `Android Gradle wrapper not found: ${gradlePath}`,
  );

  const gradleUserHome = resolveBuildGradleUserHome();
  await fs.mkdir(gradleUserHome, { recursive: true });
  const args = [
    ':app:assembleRelease',
    `-Pdart-defines=${dartDefines.map((value) => Buffer.from(value, 'utf8').toString('base64')).join(',')}`,
  ];

  await thisLog(
    logsRepo,
    buildJob.id,
    'INFO',
    `Building APK with Android Gradle wrapper: ${gradlePath}`,
  );
  const gradleInvocation = await resolveGradleInvocation(
    androidPath,
    gradlePath,
    args,
  );
  await execCommand(
    gradleInvocation.command,
    gradleInvocation.args,
    androidPath,
    (line) => thisLog(logsRepo, buildJob.id, 'INFO', line),
    10 * 60 * 1000,
    {
      ...process.env,
      GRADLE_USER_HOME: gradleUserHome,
    },
  );

  const builtApk = await findBuiltReleaseApk(templateTarget);
  if (!builtApk) {
    throw new Error(
      'Gradle build completed but app-release.apk was not found.',
    );
  }
  return builtApk;
}

async function runAndroidAabBuildWithGradle(
  templateTarget: string,
  buildJob: BuildJob,
  logsRepo: Repository<BuildLog>,
  dartDefines: string[],
): Promise<string> {
  const androidPath = join(templateTarget, 'android');
  const gradleCommand =
    process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const gradlePath = join(androidPath, gradleCommand);
  await ensurePathExists(
    gradlePath,
    `Android Gradle wrapper not found: ${gradlePath}`,
  );

  const gradleUserHome = resolveBuildGradleUserHome();
  await fs.mkdir(gradleUserHome, { recursive: true });
  const args = [
    ':app:bundleRelease',
    `-Pdart-defines=${dartDefines.map((value) => Buffer.from(value, 'utf8').toString('base64')).join(',')}`,
  ];

  await thisLog(
    logsRepo,
    buildJob.id,
    'INFO',
    `Building companion AAB with Android Gradle wrapper: ${gradlePath}`,
  );
  const gradleInvocation = await resolveGradleInvocation(
    androidPath,
    gradlePath,
    args,
  );
  await execCommand(
    gradleInvocation.command,
    gradleInvocation.args,
    androidPath,
    (line) => thisLog(logsRepo, buildJob.id, 'INFO', line),
    10 * 60 * 1000,
    {
      ...process.env,
      GRADLE_USER_HOME: gradleUserHome,
    },
  );

  const builtAab = await findBuiltReleaseAab(templateTarget);
  if (!builtAab) {
    throw new Error(
      'Gradle build completed but app-release.aab was not found.',
    );
  }
  return builtAab;
}

async function resolveGradleInvocation(
  androidPath: string,
  gradlePath: string,
  args: string[],
): Promise<{ command: string; args: string[] }> {
  if (process.platform !== 'win32') {
    return { command: gradlePath, args };
  }

  return { command: gradlePath, args };
}

function resolveBuildGradleUserHome(): string {
  return (
    process.env.BUILD_GRADLE_USER_HOME?.trim() ||
    join(process.cwd(), 'storage', 'gradle-home')
  );
}

function buildDartDefines(buildJob: BuildJob): string[] {
  const dartDefines = [
    `TENANT_ID=${buildJob.tenantId}`,
    `TENANT=${buildJob.tenantId}`,
    `THEME_ID=${buildJob.themeId ?? ''}`,
    `APP_NAME_B64=${toBase64Utf8(buildJob.appName)}`,
    `APP_LANGUAGE=${encodeURIComponent(buildJob.languages?.[0] ?? 'en')}`,
    'LANGUAGE_CONSISTENCY_ENABLED=true',
    ...mobileBuildNetworkDartDefines(),
  ];
  return dartDefines;
}

async function findBuiltDebugApk(
  templateTarget: string,
): Promise<string | null> {
  const candidates = [
    join(
      templateTarget,
      'build',
      'app',
      'outputs',
      'flutter-apk',
      'app-debug.apk',
    ),
    join(
      templateTarget,
      'build',
      'app',
      'outputs',
      'apk',
      'debug',
      'app-debug.apk',
    ),
    join(
      templateTarget,
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

async function findBuiltReleaseApk(
  templateTarget: string,
): Promise<string | null> {
  const candidates = [
    join(
      templateTarget,
      'build',
      'app',
      'outputs',
      'flutter-apk',
      'app-release.apk',
    ),
    join(
      templateTarget,
      'build',
      'app',
      'outputs',
      'apk',
      'release',
      'app-release.apk',
    ),
    join(
      templateTarget,
      'android',
      'app',
      'build',
      'outputs',
      'apk',
      'release',
      'app-release.apk',
    ),
    join(
      templateTarget,
      'build',
      'app',
      'outputs',
      'flutter-apk',
      'app-debug.apk',
    ),
    join(
      templateTarget,
      'build',
      'app',
      'outputs',
      'apk',
      'debug',
      'app-debug.apk',
    ),
    join(
      templateTarget,
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

async function findBuiltReleaseAab(
  templateTarget: string,
): Promise<string | null> {
  const candidates = [
    join(
      templateTarget,
      'build',
      'app',
      'outputs',
      'bundle',
      'release',
      'app-release.aab',
    ),
    join(
      templateTarget,
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

function resolveFlutterCommand(): string {
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

async function execCommand(
  command: string,
  args: string[],
  cwd: string,
  onOutput: (line: string) => Promise<void>,
  timeoutMs = 0,
  env?: NodeJS.ProcessEnv,
): Promise<void> {
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
        } catch (error) {
          reject(toCommandError(command, args, error));
          return;
        }
        const timer = timeoutMs
          ? setTimeout(() => {
              if (settled) return;
              settled = true;
              killBuildProcess(child);
              reject(
                new Error(
                  `${command} ${args.join(' ')} timed out after ${timeoutMs}ms`,
                ),
              );
            }, timeoutMs)
          : null;
        child.stdout?.on(
          'data',
          (chunk) => void onOutput(String(chunk).trim()),
        );
        child.stderr?.on(
          'data',
          (chunk) => void onOutput(String(chunk).trim()),
        );
        child.on('close', (code) => {
          if (settled) return;
          settled = true;
          if (timer) clearTimeout(timer);
          if (code === 0) resolve();
          else
            reject(
              new Error(
                `${command} ${args.join(' ')} failed with exit code ${code ?? -1}`,
              ),
            );
        });
        child.on('error', (error) => {
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

async function commandExists(command: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    let child: ReturnType<typeof spawn>;
    try {
      child = spawnBuildCommand(
        command,
        ['--version'],
        process.cwd(),
        undefined,
        'ignore',
      );
    } catch {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      killBuildProcess(child);
      resolve(false);
    }, 20_000);
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(code === 0);
    });
    child.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(false);
    });
  });
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
    // Optional file for template variants. Skip silently.
  }
}

function toDartPackageName(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50) || 'white_label_app'
  );
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

function inferRepoRoot(): string {
  const cwd = process.cwd();
  return /[\\/]backend$/u.test(cwd) ? join(cwd, '..') : cwd;
}

function extractArtifactName(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || 'artifact.bin';
}
