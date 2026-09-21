import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import dataSource from '../database/data-source';

async function verifyCurrent(
  source: DataSource,
): Promise<Record<string, unknown>> {
  if (!source.isInitialized) await source.initialize();
  const sourceNames = source.migrations.map((migration) => migration.name);
  const table = (await source.query(
    "SELECT to_regclass('public.migrations') AS name",
  )) as Array<{ name: string | null }>;
  if (!table[0]?.name)
    return {
      available: false,
      sourceCount: sourceNames.length,
      appliedCount: 0,
      pending: false,
      duplicates: [],
      drift: [],
    };
  const duplicates = sourceNames.filter(
    (name, index) => sourceNames.indexOf(name) !== index,
  );
  const applied = (await source.query(
    'SELECT "timestamp", "name" FROM "migrations" ORDER BY "timestamp" ASC',
  )) as Array<{ timestamp: string; name: string }>;
  const sourceNameSet = new Set(sourceNames);
  const drift = applied.filter(
    (migration) => !sourceNameSet.has(migration.name),
  );
  const pending = await source.showMigrations();
  return {
    available: true,
    sourceCount: sourceNames.length,
    appliedCount: applied.length,
    pending,
    duplicates,
    drift: drift.map((migration) => migration.name),
  };
}

async function verifyFresh(): Promise<void> {
  const url = process.env.MIGRATION_VERIFY_FRESH_DATABASE_URL;
  if (!url) return;
  const fresh = new DataSource({
    ...dataSource.options,
    url,
    name: 'theme-migration-fresh-verification',
  } as DataSourceOptions);
  try {
    await fresh.initialize();
    await fresh.runMigrations({ transaction: 'all' });
    if (await fresh.showMigrations())
      throw new Error('Fresh database still has pending migrations.');
  } finally {
    if (fresh.isInitialized) await fresh.destroy();
  }
}

async function main(): Promise<void> {
  const current = await verifyCurrent(dataSource);
  await verifyFresh();
  process.stdout.write(`${JSON.stringify(current, null, 2)}\n`);
  if (
    current.available &&
    current.duplicates instanceof Array &&
    current.duplicates.length
  )
    throw new Error('Duplicate migration names detected.');
  if (
    current.available &&
    current.drift instanceof Array &&
    current.drift.length
  )
    throw new Error('Migration drift detected.');
  if (current.available && current.pending)
    throw new Error('Pending migrations detected.');
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
