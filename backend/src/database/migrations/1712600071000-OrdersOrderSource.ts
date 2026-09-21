import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Track order channel for distributor analytics and filters (WhatsApp vs storefront vs manual).
 */
export class OrdersOrderSource1712600071000 implements MigrationInterface {
  name = 'OrdersOrderSource1712600071000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "order_source" varchar(32) NOT NULL DEFAULT 'STOREFRONT'
    `);

    const rows: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of rows) {
      const qSch = `"${schema.replace(/"/g, '""')}"`;
      const exists: { n: string }[] = await queryRunner.query(
        `SELECT 1 AS n FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'orders'`,
        [schema],
      );
      if (!exists.length) continue;
      await queryRunner.query(`
        ALTER TABLE ${qSch}."orders"
        ADD COLUMN IF NOT EXISTS "order_source" varchar(32) NOT NULL DEFAULT 'STOREFRONT'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "order_source"`);

    const rows: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of rows) {
      const qSch = `"${schema.replace(/"/g, '""')}"`;
      const exists: { n: string }[] = await queryRunner.query(
        `SELECT 1 AS n FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'orders'`,
        [schema],
      );
      if (!exists.length) continue;
      await queryRunner.query(`ALTER TABLE ${qSch}."orders" DROP COLUMN IF EXISTS "order_source"`);
    }
  }
}
