import 'dotenv/config';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { EntityManager } from 'typeorm';
import dataSource from '../database/data-source';
import { Theme } from '../common/entities/theme.entity';
import { ThemeComboMapping } from '../common/entities/theme-combo-mapping.entity';
import { TenantTheme } from '../common/entities/tenant-theme.entity';
import { TenantThemeSettings } from '../common/entities/tenant-theme-settings.entity';
import { getThemeZipArchiveRoot } from '../common/utils/storage-root';
import { writeThemeMigrationLog } from '../common/observability/theme-migration-log';
import { ThemeBackfillRun } from '../modules/theme-migration/entities/theme-backfill-run.entity';
import { ThemeBundle } from '../modules/theme-migration/entities/theme-bundle.entity';
import { ThemeDeployment } from '../modules/theme-migration/entities/theme-deployment.entity';
import { ThemeFamily } from '../modules/theme-migration/entities/theme-family.entity';
import { ThemeLegacyMapping } from '../modules/theme-migration/entities/theme-legacy-mapping.entity';
import {
  CanonicalThemeReleaseStatus,
  ThemeRelease,
} from '../modules/theme-migration/entities/theme-release.entity';

type Counters = Record<string, number>;
type Manifest = Record<string, unknown>;

type ArchiveInfo = {
  key: string;
  sha256: string;
  sizeBytes: string;
};

const APPLY = process.argv.includes('--apply');
const runKeyArg = process.argv.find((arg) => arg.startsWith('--run-key='));
const RUN_KEY =
  runKeyArg?.slice('--run-key='.length).trim() ||
  'phase1-legacy-theme-backfill';
const BACKFILL_LOCK_KEY = 'theme-canonical-backfill';

function increment(counters: Counters, key: string): void {
  counters[key] = (counters[key] ?? 0) + 1;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function manifestFor(theme: Theme): Manifest {
  const config = isObject(theme.themeConfigJson) ? theme.themeConfigJson : {};
  return isObject(config.manifest) ? config.manifest : config;
}

function releaseStatus(status: string): CanonicalThemeReleaseStatus {
  switch (status.trim().toUpperCase()) {
    case 'DRAFT':
      return 'DRAFT';
    case 'REVIEW':
      return 'REVIEW';
    case 'APPROVED':
      return 'APPROVED';
    case 'DEPRECATED':
    case 'INACTIVE':
      return 'DEPRECATED';
    case 'ARCHIVED':
      return 'ARCHIVED';
    default:
      return 'PUBLISHED';
  }
}

function familyStatus(status: string): 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED' {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'ARCHIVED') return 'ARCHIVED';
  if (normalized === 'INACTIVE' || normalized === 'DEPRECATED')
    return 'DEPRECATED';
  return 'ACTIVE';
}

function bundleStatus(status: string): 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED' {
  return status.trim().toUpperCase() === 'ARCHIVED'
    ? 'ARCHIVED'
    : status.trim().toUpperCase() === 'INACTIVE'
      ? 'DEPRECATED'
      : 'ACTIVE';
}

function sourceHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function dryId(prefix: string, legacyId: string): string {
  const hex = createHash('sha256')
    .update(`${prefix}:${legacyId}`)
    .digest('hex')
    .slice(0, 24);
  return `00000000-0000-4000-8000-${hex}`;
}

async function findArchive(theme: Theme): Promise<ArchiveInfo | null> {
  const storagePath = theme.storagePath?.trim().replace(/\\/g, '/');
  if (
    !storagePath ||
    storagePath.includes('..') ||
    !storagePath.startsWith('themes/')
  )
    return null;
  const directory = path.join(
    getThemeZipArchiveRoot(),
    ...storagePath.split('/'),
  );
  let names: string[];
  try {
    names = (await fs.readdir(directory))
      .filter((name) => name.toLowerCase().endsWith('.zip'))
      .sort();
  } catch {
    return null;
  }
  const name = names[0];
  if (!name) return null;
  const absolutePath = path.join(directory, name);
  try {
    const [sha256, stat] = await Promise.all([
      hashFile(absolutePath),
      fs.stat(absolutePath),
    ]);
    return {
      key: path
        .relative(getThemeZipArchiveRoot(), absolutePath)
        .replace(/\\/g, '/'),
      sha256,
      sizeBytes: String(stat.size),
    };
  } catch {
    return null;
  }
}

function hashFile(absolutePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(absolutePath);
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function ensureMapping(
  manager: EntityManager,
  input: Omit<ThemeLegacyMapping, 'id' | 'createdAt'>,
): Promise<ThemeLegacyMapping> {
  const repository = manager.getRepository(ThemeLegacyMapping);
  await repository
    .createQueryBuilder()
    .insert()
    .into(ThemeLegacyMapping)
    .values(input)
    .orIgnore()
    .execute();
  return repository.findOneOrFail({
    where: {
      legacyEntity: input.legacyEntity,
      legacyId: input.legacyId,
      canonicalEntity: input.canonicalEntity,
    },
  });
}

async function prepareRun(manager: EntityManager): Promise<void> {
  if (!APPLY) return;
  const repository = manager.getRepository(ThemeBackfillRun);
  const existing = await repository.findOne({ where: { runKey: RUN_KEY } });
  if (existing?.status === 'RUNNING')
    throw new Error(`Backfill run "${RUN_KEY}" is already running.`);
  await repository.save(
    repository.create({
      ...(existing ? { id: existing.id } : {}),
      runKey: RUN_KEY,
      status: 'RUNNING',
      dryRun: false,
      sourceSnapshotAt: new Date(),
      countersJson: {},
      errorMessage: null,
      finishedAt: null,
    }),
  );
}

async function finishRun(
  manager: EntityManager,
  status: 'COMPLETED' | 'FAILED' | 'DRY_RUN',
  counters: Counters,
  errorMessage: string | null,
): Promise<void> {
  if (!APPLY) return;
  await manager
    .getRepository(ThemeBackfillRun)
    .update(
      { runKey: RUN_KEY },
      { status, countersJson: counters, errorMessage, finishedAt: new Date() },
    );
}

async function backfill(manager: EntityManager): Promise<Counters> {
  const counters: Counters = {};
  const themes = await manager.getRepository(Theme).find();
  const combos = await manager.getRepository(ThemeComboMapping).find();
  const tenantThemes = await manager.getRepository(TenantTheme).find();
  const tenantSettings = await manager
    .getRepository(TenantThemeSettings)
    .find();
  const familyRepository = manager.getRepository(ThemeFamily);
  const releaseRepository = manager.getRepository(ThemeRelease);
  const existingFamilies = new Map(
    (await familyRepository.find()).map((family) => [family.slug, family]),
  );
  const existingReleases = new Map(
    (await releaseRepository.find()).flatMap((release) =>
      release.legacyThemeId ? [[release.legacyThemeId, release] as const] : [],
    ),
  );
  const existingBundles = new Map(
    (await manager.getRepository(ThemeBundle).find()).flatMap((bundle) =>
      bundle.legacyComboId ? [[bundle.legacyComboId, bundle] as const] : [],
    ),
  );
  const existingDeployments = await manager
    .getRepository(ThemeDeployment)
    .find();
  const deploymentByLegacySelection = new Map(
    existingDeployments.flatMap((deployment) =>
      deployment.legacyTenantThemeId
        ? [[deployment.legacyTenantThemeId, deployment] as const]
        : [],
    ),
  );
  const deploymentByTenant = new Map(
    existingDeployments
      .filter(
        (deployment) =>
          deployment.environment === 'PRODUCTION' &&
          deployment.status === 'ACTIVE',
      )
      .map((deployment) => [deployment.tenantId, deployment]),
  );
  const releaseByThemeId = new Map<string, ThemeRelease>();
  const bundleByComboId = new Map<string, ThemeBundle>();

  counters.themesSeen = themes.length;
  for (const theme of themes) {
    const manifest = manifestFor(theme);
    const archive = await findArchive(theme);
    const familySlug = `legacy-${theme.id}`;
    let family = existingFamilies.get(familySlug);
    if (!family) {
      family = familyRepository.create({
        slug: familySlug,
        displayName: theme.themeName || theme.slug || theme.id,
        description:
          isObject(theme.themeConfigJson) &&
          typeof theme.themeConfigJson.description === 'string'
            ? theme.themeConfigJson.description
            : null,
        status: familyStatus(theme.status),
        metadataJson: { legacyThemeId: theme.id, legacySlug: theme.slug },
      });
      if (APPLY) family = await familyRepository.save(family);
      else family.id = dryId('family', theme.id);
      existingFamilies.set(familySlug, family);
    }
    increment(counters, 'familiesReady');

    let release = existingReleases.get(theme.id);
    const manifestVersion =
      typeof manifest.version === 'string'
        ? manifest.version
        : theme.themeVersion || '1';
    const version = theme.themeVersion?.trim() || manifestVersion;
    if (!release) {
      release = releaseRepository.create({
        themeFamilyId: family.id,
        channel: theme.themeChannel === 'MOBILE' ? 'MOBILE' : 'WEB',
        version,
        status: releaseStatus(theme.status),
        manifestVersion,
        manifestJson: manifest,
        storageKey: theme.storagePath,
        archiveKey: archive?.key ?? null,
        packageSha256: archive?.sha256 ?? null,
        packageSizeBytes: archive?.sizeBytes ?? null,
        legacyThemeId: theme.id,
        publishedAt:
          releaseStatus(theme.status) === 'PUBLISHED' ? theme.createdAt : null,
      });
      if (APPLY) release = await releaseRepository.save(release);
      else release.id = dryId('release', theme.id);
      existingReleases.set(theme.id, release);
    }
    releaseByThemeId.set(theme.id, release);
    increment(counters, 'releasesReady');

    if (APPLY) {
      await ensureMapping(manager, {
        legacyEntity: 'themes',
        legacyId: theme.id,
        canonicalEntity: 'theme_families',
        canonicalId: family.id,
        sourceTable: 'themes',
        sourceVersion: theme.themeVersion,
        sourceHash: sourceHash(theme),
      });
      await ensureMapping(manager, {
        legacyEntity: 'themes',
        legacyId: theme.id,
        canonicalEntity: 'theme_releases',
        canonicalId: release.id,
        sourceTable: 'themes',
        sourceVersion: theme.themeVersion,
        sourceHash: sourceHash(theme),
      });
    }
  }

  const comboRepository = manager.getRepository(ThemeBundle);
  for (const combo of combos) {
    const webRelease = releaseByThemeId.get(combo.webThemeId);
    const mobileRelease = releaseByThemeId.get(combo.mobileThemeId);
    if (!webRelease || !mobileRelease) {
      increment(counters, 'bundlesSkipped');
      continue;
    }
    let bundle = existingBundles.get(combo.id);
    if (!bundle) {
      bundle = comboRepository.create({
        name: combo.name,
        status: bundleStatus(combo.status),
        webReleaseId: webRelease.id,
        mobileReleaseId: mobileRelease.id,
        previewImage: combo.previewImage,
        legacyComboId: combo.id,
      });
      if (APPLY) bundle = await comboRepository.save(bundle);
      else bundle.id = dryId('bundle', combo.id);
      existingBundles.set(combo.id, bundle);
    }
    bundleByComboId.set(combo.id, bundle);
    increment(counters, 'bundlesReady');
    if (APPLY) {
      await ensureMapping(manager, {
        legacyEntity: 'theme_combo_mapping',
        legacyId: combo.id,
        canonicalEntity: 'theme_bundles',
        canonicalId: bundle.id,
        sourceTable: 'theme_combo_mapping',
        sourceVersion: null,
        sourceHash: sourceHash(combo),
      });
    }
  }

  const settingsByTenant = new Map(
    tenantSettings.map((setting) => [setting.tenantId, setting]),
  );
  const tenantThemeByTenant = new Map(
    tenantThemes.map((selection) => [selection.tenantId, selection]),
  );
  const tenantIds = new Set([
    ...settingsByTenant.keys(),
    ...tenantThemeByTenant.keys(),
  ]);
  const deploymentRepository = manager.getRepository(ThemeDeployment);
  for (const tenantId of tenantIds) {
    const settings = settingsByTenant.get(tenantId);
    const legacySelection = tenantThemeByTenant.get(tenantId);
    const webThemeId = settings?.webThemeId ?? legacySelection?.themeId;
    if (!webThemeId) {
      increment(counters, 'deploymentsSkipped');
      continue;
    }
    const webRelease = releaseByThemeId.get(webThemeId);
    const mobileThemeId = settings?.mobileThemeId ?? null;
    const mobileRelease = mobileThemeId
      ? releaseByThemeId.get(mobileThemeId)
      : undefined;
    if (!webRelease || (mobileThemeId && !mobileRelease)) {
      increment(counters, 'deploymentsSkipped');
      continue;
    }
    const comboId = settings?.comboId ?? null;
    const bundle = comboId ? bundleByComboId.get(comboId) : undefined;
    let deployment = legacySelection
      ? deploymentByLegacySelection.get(legacySelection.id)
      : deploymentByTenant.get(tenantId);
    if (!deployment) {
      deployment = deploymentRepository.create({
        tenantId,
        environment: 'PRODUCTION',
        status: 'ACTIVE',
        webReleaseId: webRelease.id,
        mobileReleaseId: mobileRelease?.id ?? null,
        bundleId: bundle?.id ?? null,
        legacyTenantThemeId: legacySelection?.id ?? null,
        legacyTenantThemeSettingsTenantId: settings?.tenantId ?? null,
        source: 'BACKFILL',
        deployedAt: settings?.updatedAt ?? legacySelection?.selectedAt ?? null,
      });
    } else {
      deployment.webReleaseId = webRelease.id;
      deployment.mobileReleaseId = mobileRelease?.id ?? null;
      deployment.bundleId = bundle?.id ?? null;
      deployment.legacyTenantThemeSettingsTenantId = settings?.tenantId ?? null;
      deployment.deployedAt =
        settings?.updatedAt ??
        legacySelection?.selectedAt ??
        deployment.deployedAt;
    }
    if (APPLY) deployment = await deploymentRepository.save(deployment);
    else if (!deployment.id) deployment.id = dryId('deployment', tenantId);
    if (deployment.legacyTenantThemeId) {
      deploymentByLegacySelection.set(
        deployment.legacyTenantThemeId,
        deployment,
      );
    }
    deploymentByTenant.set(tenantId, deployment);
    increment(counters, 'deploymentsReady');
    if (APPLY && legacySelection) {
      await ensureMapping(manager, {
        legacyEntity: 'tenant_themes',
        legacyId: legacySelection.id,
        canonicalEntity: 'theme_deployments',
        canonicalId: deployment.id,
        sourceTable: 'tenant_themes',
        sourceVersion: null,
        sourceHash: sourceHash(legacySelection),
      });
    }
    if (APPLY && settings) {
      await ensureMapping(manager, {
        legacyEntity: 'tenant_theme_settings',
        legacyId: settings.tenantId,
        canonicalEntity: 'theme_deployments',
        canonicalId: deployment.id,
        sourceTable: 'tenant_theme_settings',
        sourceVersion: null,
        sourceHash: sourceHash(settings),
      });
    }
  }

  return counters;
}

async function executeBackfill(): Promise<Counters> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  await runner.query('SELECT pg_advisory_lock(hashtext($1))', [
    BACKFILL_LOCK_KEY,
  ]);
  try {
    if (!APPLY) {
      await runner.startTransaction('REPEATABLE READ');
      try {
        const counters = await backfill(runner.manager);
        await runner.rollbackTransaction();
        return counters;
      } catch (error) {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        throw error;
      }
    }

    await runner.startTransaction('REPEATABLE READ');
    try {
      await prepareRun(runner.manager);
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    }

    await runner.startTransaction('REPEATABLE READ');
    try {
      const counters = await backfill(runner.manager);
      await finishRun(runner.manager, 'COMPLETED', counters, null);
      await runner.commitTransaction();
      return counters;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.startTransaction('REPEATABLE READ');
      try {
        const errorType = error instanceof Error ? error.name : 'UnknownError';
        await finishRun(runner.manager, 'FAILED', {}, errorType);
        await runner.commitTransaction();
      } catch {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
      }
      throw error;
    }
  } finally {
    await runner
      .query('SELECT pg_advisory_unlock(hashtext($1))', [BACKFILL_LOCK_KEY])
      .catch(() => undefined);
    await runner.release();
  }
}

async function main(): Promise<void> {
  writeThemeMigrationLog({
    event: 'theme.backfill.requested',
    phase: 'phase-1',
    implementation: 'canonical-backfill',
    mode: APPLY ? 'apply' : 'dry-run',
    metadata: { runKey: RUN_KEY },
  });
  try {
    await dataSource.initialize();
    const counters = await executeBackfill();
    writeThemeMigrationLog({
      event: 'theme.backfill.completed',
      phase: 'phase-1',
      implementation: 'canonical-backfill',
      mode: APPLY ? 'apply' : 'dry-run',
      metadata: { runKey: RUN_KEY, counters },
    });
  } catch (error: unknown) {
    const errorType = error instanceof Error ? error.name : 'UnknownError';
    writeThemeMigrationLog({
      event: 'theme.backfill.failed',
      phase: 'phase-1',
      implementation: 'canonical-backfill',
      mode: APPLY ? 'apply' : 'dry-run',
      errorType,
      metadata: { runKey: RUN_KEY },
    });
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}

void main();
