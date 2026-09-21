import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StorefrontRazorpayPayments1712600167000 implements MigrationInterface {
  name = 'StorefrontRazorpayPayments1712600167000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.patchSchema(queryRunner, 'public');
    const schemas: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const row of schemas) {
      await this.patchSchema(queryRunner, row.schema_name);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.revertSchema(queryRunner, 'public');
    const schemas: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const row of schemas) {
      await this.revertSchema(queryRunner, row.schema_name);
    }
  }

  private async patchSchema(
    queryRunner: QueryRunner,
    schema: string,
  ): Promise<void> {
    if (!(await this.hasOrderPayments(queryRunner, schema))) return;
    const q = this.quote(schema);
    await queryRunner.query(`
      ALTER TABLE ${q}."order_payments"
      ADD COLUMN IF NOT EXISTS "razorpay_order_id" varchar(64),
      ADD COLUMN IF NOT EXISTS "razorpay_payment_id" varchar(64)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_payments_razorpay_order_unique"
      ON ${q}."order_payments" ("razorpay_order_id")
      WHERE "razorpay_order_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_payments_razorpay_payment_unique"
      ON ${q}."order_payments" ("razorpay_payment_id")
      WHERE "razorpay_payment_id" IS NOT NULL
    `);
  }

  private async revertSchema(
    queryRunner: QueryRunner,
    schema: string,
  ): Promise<void> {
    if (!(await this.hasOrderPayments(queryRunner, schema))) return;
    const q = this.quote(schema);
    await queryRunner.query(
      `DROP INDEX IF EXISTS ${q}."idx_order_payments_razorpay_payment_unique"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS ${q}."idx_order_payments_razorpay_order_unique"`,
    );
    await queryRunner.query(`
      ALTER TABLE ${q}."order_payments"
      DROP COLUMN IF EXISTS "razorpay_payment_id",
      DROP COLUMN IF EXISTS "razorpay_order_id"
    `);
  }

  private async hasOrderPayments(
    queryRunner: QueryRunner,
    schema: string,
  ): Promise<boolean> {
    const rows: Array<{ value: number }> = await queryRunner.query(
      `SELECT 1 AS value FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = 'order_payments'`,
      [schema],
    );
    return rows.length > 0;
  }

  private quote(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
