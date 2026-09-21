import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B2B checkout: persist selected shipping address (public `customer_addresses` id)
 * and payment mode (`CREDIT` vs `PREPAID`) on tenant-scoped `orders`.
 */
export class OrdersShippingAddressPaymentMode1712600056000 implements MigrationInterface {
  name = 'OrdersShippingAddressPaymentMode1712600056000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "shipping_address_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "payment_mode" varchar(32) NOT NULL DEFAULT 'CREDIT'
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
        ADD COLUMN IF NOT EXISTS "shipping_address_id" uuid NULL
      `);
      await queryRunner.query(`
        ALTER TABLE ${qSch}."orders"
        ADD COLUMN IF NOT EXISTS "payment_mode" varchar(32) NOT NULL DEFAULT 'CREDIT'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "shipping_address_id"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_mode"`);

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
      await queryRunner.query(`ALTER TABLE ${qSch}."orders" DROP COLUMN IF EXISTS "shipping_address_id"`);
      await queryRunner.query(`ALTER TABLE ${qSch}."orders" DROP COLUMN IF EXISTS "payment_mode"`);
    }
  }
}
