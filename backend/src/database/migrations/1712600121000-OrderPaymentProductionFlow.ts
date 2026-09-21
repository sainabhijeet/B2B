import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderPaymentProductionFlow1712600121000 implements MigrationInterface {
  name = 'OrderPaymentProductionFlow1712600121000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.patchSchema(queryRunner, 'public');
    const rows: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of rows) {
      const exists: { n: string }[] = await queryRunner.query(
        `SELECT 1 AS n FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'order_payments'`,
        [schema],
      );
      if (exists.length) await this.patchSchema(queryRunner, schema);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.revertSchema(queryRunner, 'public');
    const rows: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of rows) {
      const exists: { n: string }[] = await queryRunner.query(
        `SELECT 1 AS n FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'order_payments'`,
        [schema],
      );
      if (exists.length) await this.revertSchema(queryRunner, schema);
    }
  }

  private async patchSchema(queryRunner: QueryRunner, schema: string): Promise<void> {
    const q = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`ALTER TABLE ${q}."orders" ALTER COLUMN "payment_mode" SET DEFAULT 'CREDIT'`);
    await queryRunner.query(`ALTER TABLE ${q}."orders" ALTER COLUMN "payment_status" SET DEFAULT 'PENDING'`);
    await queryRunner.query(`
      UPDATE ${q}."orders"
      SET "payment_mode" = CASE
        WHEN UPPER(COALESCE("payment_mode", 'CREDIT')) = 'PREPAID' THEN 'UPI_QR'
        WHEN UPPER(COALESCE("payment_mode", 'CREDIT')) IN ('CREDIT', 'UPI_QR', 'NEFT', 'CASH') THEN UPPER("payment_mode")
        ELSE 'CREDIT'
      END,
      "payment_status" = CASE
        WHEN UPPER(COALESCE("payment_status", 'PENDING')) = 'UPLOADED' THEN 'SUBMITTED'
        WHEN UPPER(COALESCE("payment_status", 'PENDING')) = 'APPROVED' THEN 'VERIFIED'
        WHEN UPPER(COALESCE("payment_status", 'PENDING')) IN ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED') THEN UPPER("payment_status")
        ELSE 'PENDING'
      END
    `);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ALTER COLUMN "payment_reference" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ALTER COLUMN "payment_screenshot_url" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ADD COLUMN IF NOT EXISTS "payment_method" varchar(32) NOT NULL DEFAULT 'UPI_QR'`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ADD COLUMN IF NOT EXISTS "utr_number" varchar(128) NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ADD COLUMN IF NOT EXISTS "amount" numeric(12,2) NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(128) NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMPTZ NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMPTZ NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMPTZ NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ADD COLUMN IF NOT EXISTS "verified_by" uuid NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ADD COLUMN IF NOT EXISTS "rejection_reason" text NULL`);
    await queryRunner.query(`
      UPDATE ${q}."order_payments" op
      SET "payment_method" = CASE
          WHEN UPPER(COALESCE(o."payment_mode", 'UPI_QR')) = 'PREPAID' THEN 'UPI_QR'
          WHEN UPPER(COALESCE(o."payment_mode", 'UPI_QR')) IN ('CREDIT', 'UPI_QR', 'NEFT', 'CASH') THEN UPPER(o."payment_mode")
          ELSE 'UPI_QR'
        END,
        "utr_number" = COALESCE(NULLIF(op."utr_number", ''), op."payment_reference"),
        "amount" = COALESCE(op."amount", o."total_amount"),
        "submitted_at" = COALESCE(op."submitted_at", op."created_at"),
        "status" = CASE
          WHEN UPPER(COALESCE(op."status", 'PENDING')) = 'UPLOADED' THEN 'SUBMITTED'
          WHEN UPPER(COALESCE(op."status", 'PENDING')) = 'APPROVED' THEN 'VERIFIED'
          WHEN UPPER(COALESCE(op."status", 'PENDING')) IN ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED') THEN UPPER(op."status")
          ELSE 'PENDING'
        END
      FROM ${q}."orders" o
      WHERE o."id" = op."order_id"
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_payments_tenant_idempotency_unique"
       ON ${q}."order_payments" ("tenant_id", "idempotency_key")
       WHERE "idempotency_key" IS NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP CONSTRAINT IF EXISTS "FK_order_payments_verified_by"`);
    await queryRunner.query(
      `ALTER TABLE ${q}."order_payments"
       ADD CONSTRAINT "FK_order_payments_verified_by" FOREIGN KEY ("verified_by") REFERENCES public."users"("id") ON DELETE SET NULL`,
    );
  }

  private async revertSchema(queryRunner: QueryRunner, schema: string): Promise<void> {
    const q = `"${schema.replace(/"/g, '""')}"`;
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP CONSTRAINT IF EXISTS "FK_order_payments_verified_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS ${q}."idx_order_payments_tenant_idempotency_unique"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP COLUMN IF EXISTS "rejection_reason"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP COLUMN IF EXISTS "verified_by"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP COLUMN IF EXISTS "rejected_at"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP COLUMN IF EXISTS "verified_at"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP COLUMN IF EXISTS "submitted_at"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP COLUMN IF EXISTS "idempotency_key"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP COLUMN IF EXISTS "amount"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP COLUMN IF EXISTS "utr_number"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP COLUMN IF EXISTS "payment_method"`);
  }
}
