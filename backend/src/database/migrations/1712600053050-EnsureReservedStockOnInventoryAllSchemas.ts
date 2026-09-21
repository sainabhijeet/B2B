import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensures `inventory.reserved_stock` exists on `public` and every tenant schema.
 * Fixes 500s when TypeORM selects `reserved_stock` but older tenant DDL (post-catalog
 * move, pre-commerce migration) never added the column.
 */
export class EnsureReservedStockOnInventoryAllSchemas1712600053050 implements MigrationInterface {
  name = 'EnsureReservedStockOnInventoryAllSchemas1712600053050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inventory"
      ADD COLUMN IF NOT EXISTS "reserved_stock" integer NOT NULL DEFAULT 0
    `);

    const rows: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of rows) {
      const qSch = `"${schema.replace(/"/g, '""')}"`;
      const exists: { n: string }[] = await queryRunner.query(
        `SELECT 1 AS n FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'inventory'`,
        [schema],
      );
      if (!exists.length) continue;
      await queryRunner.query(`
        ALTER TABLE ${qSch}."inventory"
        ADD COLUMN IF NOT EXISTS "reserved_stock" integer NOT NULL DEFAULT 0
      `);
    }
  }

  public async down(): Promise<void> {
    /** Non-reversible default — column kept for app compatibility. */
  }
}
