import 'dotenv/config';
import { existsSync, readdirSync, statSync } from 'node:fs';
import * as path from 'node:path';
import dataSource from '../database/data-source';
import {
  getBackendStorageRoot,
  getThemeZipArchiveRoot,
} from '../common/utils/storage-root';

type QueryRow = Record<string, unknown>;
type CountResult = { count: number | null; error?: string };

const INVENTORY_TABLES = [
  'themes',
  'theme_preview_images',
  'theme_combo_mapping',
  'tenant_themes',
  'tenant_theme_settings',
  'tenant_theme_changes',
  'tenant_sections',
  'tenant_theme_tokens',
  'tenants',
  'theme_families',
  'theme_releases',
  'theme_bundles',
  'theme_deployments',
  'theme_legacy_mappings',
  'theme_backfill_runs',
] as const;

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

async function safeCount(table: string): Promise<CountResult> {
  try {
    const rows = (await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM "${table}"`,
    )) as QueryRow[];
    return { count: Number(rows[0]?.count ?? 0) };
  } catch (error: unknown) {
    return { count: null, error: errorName(error) };
  }
}

async function safeQuery(
  sql: string,
): Promise<{ rows: QueryRow[] | null; error?: string }> {
  try {
    return { rows: (await dataSource.query(sql)) as QueryRow[] };
  } catch (error: unknown) {
    return { rows: null, error: errorName(error) };
  }
}

function directoryNames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function countFiles(dir: string, extension?: string): number {
  if (!existsSync(dir)) return 0;
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((entry) => {
      if (!entry.isFile()) return false;
      return extension ? entry.name.toLowerCase().endsWith(extension) : true;
    }).length;
  } catch {
    return 0;
  }
}

function scanStorageRoot(root: string): Record<string, unknown> {
  const resolvedRoot = path.resolve(root);
  const themeRoot = path.join(resolvedRoot, 'themes');
  const channels = ['web', 'mobile'].map((channel) => {
    const channelRoot = path.join(themeRoot, channel);
    const slugs = directoryNames(channelRoot);
    return {
      channel,
      themeDirectoryCount: slugs.length,
      extractedManifestCount: slugs.filter((slug) =>
        existsSync(path.join(channelRoot, slug, 'theme.json')),
      ).length,
      zipFileCount: slugs.reduce(
        (total, slug) =>
          total + countFiles(path.join(channelRoot, slug), '.zip'),
        0,
      ),
    };
  });

  let rootStat: { exists: boolean; isDirectory: boolean } = {
    exists: false,
    isDirectory: false,
  };
  try {
    const stat = statSync(resolvedRoot);
    rootStat = { exists: true, isDirectory: stat.isDirectory() };
  } catch {
    // A missing storage root is a useful inventory result, not a fatal error.
  }

  return { path: resolvedRoot, ...rootStat, channels };
}

async function run(): Promise<void> {
  const report: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    phase: 'phase-0',
    implementation: 'legacy-observation-only',
    migrationFlags: {
      diagnosticsEnabled:
        process.env.THEME_MIGRATION_DIAGNOSTICS_ENABLED === 'true',
      shadowReadsEnabled: process.env.THEME_MIGRATION_SHADOW_READS === 'true',
      dualWriteEnabled: process.env.THEME_MIGRATION_DUAL_WRITE === 'true',
      canonicalRuntimeEnabled:
        process.env.THEME_MIGRATION_CANONICAL_RUNTIME === 'true',
      rolloutPercent: Number(process.env.THEME_MIGRATION_ROLLOUT_PERCENT ?? 0),
    },
    database: {},
    storage: {
      runtime: scanStorageRoot(getBackendStorageRoot()),
      zipArchive: scanStorageRoot(getThemeZipArchiveRoot()),
    },
  };

  try {
    await dataSource.initialize();
    const tableCounts: Record<string, CountResult> = {};
    for (const table of INVENTORY_TABLES)
      tableCounts[table] = await safeCount(table);

    const grouped = await safeQuery(
      'SELECT theme_channel AS channel, status, COUNT(*)::int AS count, COUNT(storage_path)::int AS stored_count FROM "themes" GROUP BY theme_channel, status ORDER BY theme_channel, status',
    );
    const storagePaths = await safeQuery(
      'SELECT COUNT(DISTINCT storage_path)::int AS unique_storage_paths, COUNT(*) FILTER (WHERE storage_path IS NULL)::int AS themes_without_storage_path FROM "themes"',
    );

    report.database = {
      reachable: true,
      tableCounts,
      themesByChannelAndStatus: grouped.rows ?? { error: grouped.error },
      storagePathSummary: storagePaths.rows ?? { error: storagePaths.error },
    };
  } catch (error: unknown) {
    report.database = { reachable: false, error: errorName(error) };
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

void run().catch((error: unknown) => {
  process.exitCode = 1;
  process.stderr.write(
    `Theme migration inventory failed: ${errorName(error)}\n`,
  );
});
