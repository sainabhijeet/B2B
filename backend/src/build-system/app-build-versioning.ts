import { EntityManager, Repository } from 'typeorm';
import { AppVersion } from '../common/entities/app-version.entity';
import { BuildJob } from '../common/entities/build-job.entity';

export type AppBuildPlatform = 'ANDROID' | 'IOS';

export type BuildVersion = {
  versionCode: number;
  versionName: string;
  platform: AppBuildPlatform;
};

export function platformForBuildType(buildType: BuildJob['buildType']): AppBuildPlatform | null {
  if (buildType === 'ANDROID_APK' || buildType === 'ANDROID_AAB') return 'ANDROID';
  if (buildType === 'IOS_IPA') return 'IOS';
  return null;
}

export async function reserveNextAppBuildVersion(
  manager: EntityManager,
  buildJob: BuildJob,
): Promise<AppVersion | null> {
  const platform = platformForBuildType(buildJob.buildType);
  if (!platform) return null;

  await manager.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${buildJob.tenantId}:${platform}:app-build-version`]);
  const rows = await manager.query(
    `
      SELECT COALESCE(build_number, version_code, 0)::int AS "latestBuildNumber",
             version_name AS "latestVersionName"
      FROM app_versions
      WHERE tenant_id = $1 AND platform = $2
      ORDER BY COALESCE(build_number, version_code, 0) DESC
      LIMIT 1
    `,
    [buildJob.tenantId, platform],
  );
  const latestBuildNumber = Number(rows?.[0]?.latestBuildNumber ?? 0);
  const latestVersionName = typeof rows?.[0]?.latestVersionName === 'string' ? rows[0].latestVersionName : '1.0.0';
  const buildNumber = latestBuildNumber + 1;
  const versionName = buildNumber === 1 && latestVersionName === '1.0.0' ? '1.0.0' : bumpPatch(latestVersionName);

  return manager.save(
    AppVersion,
    manager.create(AppVersion, {
      tenantId: buildJob.tenantId,
      buildJobId: buildJob.id,
      artifactId: null,
      platform,
      buildNumber,
      versionCode: buildNumber,
      versionName,
      buildStatus: 'QUEUED',
      releaseNotes: 'Auto-created from mobile app rebuild',
      status: 'DRAFT',
      startedAt: null,
      completedAt: null,
    }),
  );
}

export async function getReservedBuildVersion(
  repo: Repository<AppVersion>,
  buildJob: BuildJob,
): Promise<BuildVersion | null> {
  const platform = platformForBuildType(buildJob.buildType);
  if (!platform) return null;
  const row = await repo.findOne({
    where: { buildJobId: buildJob.id, platform },
    order: { createdAt: 'DESC' },
  });
  if (!row) return null;
  const versionCode = row.buildNumber ?? row.versionCode;
  return { platform, versionCode, versionName: row.versionName };
}

export async function markReservedBuildVersionStarted(
  repo: Repository<AppVersion>,
  buildJob: BuildJob,
): Promise<void> {
  const platform = platformForBuildType(buildJob.buildType);
  if (!platform) return;
  await repo.update(
    { buildJobId: buildJob.id, platform },
    { buildStatus: 'RUNNING', startedAt: new Date() },
  );
}

export async function markReservedBuildVersionFinished(
  repo: Repository<AppVersion>,
  buildJob: BuildJob,
  status: 'SUCCESS' | 'FAILED',
  artifactId: string | null = null,
): Promise<void> {
  const platform = platformForBuildType(buildJob.buildType);
  if (!platform) return;
  await repo.update(
    { buildJobId: buildJob.id, platform },
    {
      buildStatus: status,
      artifactId,
      completedAt: new Date(),
    },
  );
}

function bumpPatch(versionName: string): string {
  const [major, minor, patch] = versionName.split('.').map((v) => Number(v));
  if ([major, minor, patch].some((n) => Number.isNaN(n))) return '1.0.0';
  return `${major}.${minor}.${patch + 1}`;
}
