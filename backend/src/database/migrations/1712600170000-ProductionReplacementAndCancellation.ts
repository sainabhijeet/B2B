import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionReplacementAndCancellation1712600170000
  implements MigrationInterface
{
  name = 'ProductionReplacementAndCancellation1712600170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.patchSchema(queryRunner, 'public');
    const tenants: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const tenant of tenants) {
      await this.patchSchema(queryRunner, tenant.schema_name);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tenants: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const tenant of tenants) {
      await this.unpatchSchema(queryRunner, tenant.schema_name);
    }
    await this.unpatchSchema(queryRunner, 'public');
  }

  private async patchSchema(queryRunner: QueryRunner, schema: string): Promise<void> {
    const q = this.quote(schema);
    const exists: Array<{ value: number }> = await queryRunner.query(
      `SELECT 1 AS value FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'order_requests'`,
      [schema],
    );
    if (!exists.length) return;

    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ADD COLUMN IF NOT EXISTS "razorpay_refund_id" varchar(64) NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" ADD COLUMN IF NOT EXISTS "refunded_at" timestamptz NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_payments_razorpay_refund_id" ON ${q}."order_payments" ("razorpay_refund_id") WHERE "razorpay_refund_id" IS NOT NULL`);

    await queryRunner.query(`ALTER TABLE ${q}."order_requests" DROP CONSTRAINT IF EXISTS "CHK_order_requests_type"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" DROP CONSTRAINT IF EXISTS "CHK_order_requests_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS ${q}."idx_order_requests_active_unique"`);
    await queryRunner.query(`UPDATE ${q}."order_requests" SET "type" = 'REPLACEMENT' WHERE "type" = 'RETURN'`);
    await queryRunner.query(`UPDATE ${q}."order_requests" SET "status" = 'COMPLETED' WHERE "status" = 'APPROVED'`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ADD COLUMN IF NOT EXISTS "distributor_id" uuid NULL`);
    await queryRunner.query(`UPDATE ${q}."order_requests" SET "distributor_id" = "tenant_id" WHERE "distributor_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ALTER COLUMN "distributor_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ADD COLUMN IF NOT EXISTS "reason_code" varchar(40) NULL`);
    await queryRunner.query(`UPDATE ${q}."order_requests" SET "reason_code" = CASE WHEN "type" = 'CANCEL' THEN 'OTHER' ELSE 'OTHER' END WHERE "reason_code" IS NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ALTER COLUMN "reason_code" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ADD COLUMN IF NOT EXISTS "description" text NULL`);
    await queryRunner.query(`UPDATE ${q}."order_requests" SET "description" = "reason" WHERE "description" IS NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ADD COLUMN IF NOT EXISTS "photo_urls" jsonb NOT NULL DEFAULT '[]'::jsonb`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" DROP COLUMN IF EXISTS "reason"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ALTER COLUMN "status" TYPE varchar(32)`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ADD CONSTRAINT "CHK_order_requests_type" CHECK ("type" IN ('REPLACEMENT', 'CANCEL'))`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ADD CONSTRAINT "CHK_order_requests_status" CHECK ("status" IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REPLACEMENT_SHIPPED', 'COMPLETED'))`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ADD CONSTRAINT "FK_order_requests_distributor" FOREIGN KEY ("distributor_id") REFERENCES public."tenants"("id") ON DELETE CASCADE`);
    await queryRunner.query(`
      WITH ranked AS (
        SELECT "id", row_number() OVER (
          PARTITION BY "tenant_id", "order_id"
          ORDER BY "created_at" DESC, "id" DESC
        ) AS rn
        FROM ${q}."order_requests"
        WHERE "status" IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REPLACEMENT_SHIPPED')
      )
      UPDATE ${q}."order_requests" request
      SET "status" = 'REJECTED',
          "review_note" = COALESCE("review_note", 'Closed while enforcing one active request per order.'),
          "reviewed_at" = COALESCE("reviewed_at", now())
      FROM ranked
      WHERE request."id" = ranked."id" AND ranked.rn > 1
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_order_requests_active_unique" ON ${q}."order_requests" ("tenant_id", "order_id") WHERE "status" IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REPLACEMENT_SHIPPED')`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${q}."replacement_shipments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "request_id" uuid NOT NULL,
        "status" varchar(24) NOT NULL DEFAULT 'CREATED',
        "created_by" uuid NOT NULL,
        "shipped_at" timestamptz NULL,
        "completed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_replacement_shipments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_replacement_shipments_request" UNIQUE ("tenant_id", "request_id"),
        CONSTRAINT "CHK_replacement_shipments_status" CHECK ("status" IN ('CREATED', 'SHIPPED', 'COMPLETED')),
        CONSTRAINT "FK_replacement_shipments_tenant" FOREIGN KEY ("tenant_id") REFERENCES public."tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_replacement_shipments_order" FOREIGN KEY ("order_id") REFERENCES ${q}."orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_replacement_shipments_request" FOREIGN KEY ("request_id") REFERENCES ${q}."order_requests"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_replacement_shipments_created_by" FOREIGN KEY ("created_by") REFERENCES public."users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_replacement_shipments_order" ON ${q}."replacement_shipments" ("tenant_id", "order_id", "created_at" DESC)`);
  }

  private async unpatchSchema(queryRunner: QueryRunner, schema: string): Promise<void> {
    const q = this.quote(schema);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q}."replacement_shipments"`);
    const exists: Array<{ value: number }> = await queryRunner.query(
      `SELECT 1 AS value FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'order_requests'`,
      [schema],
    );
    if (!exists.length) return;
    await queryRunner.query(`DROP INDEX IF EXISTS ${q}."idx_order_payments_razorpay_refund_id"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP COLUMN IF EXISTS "refunded_at"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_payments" DROP COLUMN IF EXISTS "razorpay_refund_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS ${q}."idx_order_requests_active_unique"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" DROP CONSTRAINT IF EXISTS "FK_order_requests_distributor"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" DROP CONSTRAINT IF EXISTS "CHK_order_requests_type"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" DROP CONSTRAINT IF EXISTS "CHK_order_requests_status"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ADD COLUMN IF NOT EXISTS "reason" text NULL`);
    await queryRunner.query(`UPDATE ${q}."order_requests" SET "reason" = COALESCE("description", "reason_code", 'Other') WHERE "reason" IS NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ALTER COLUMN "reason" SET NOT NULL`);
    await queryRunner.query(`UPDATE ${q}."order_requests" SET "type" = 'RETURN' WHERE "type" = 'REPLACEMENT'`);
    await queryRunner.query(`UPDATE ${q}."order_requests" SET "status" = 'APPROVED' WHERE "status" IN ('UNDER_REVIEW', 'REPLACEMENT_SHIPPED', 'COMPLETED')`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" DROP COLUMN IF EXISTS "photo_urls"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" DROP COLUMN IF EXISTS "reason_code"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" DROP COLUMN IF EXISTS "distributor_id"`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ALTER COLUMN "status" TYPE varchar(16)`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ADD CONSTRAINT "CHK_order_requests_type" CHECK ("type" IN ('RETURN', 'CANCEL'))`);
    await queryRunner.query(`ALTER TABLE ${q}."order_requests" ADD CONSTRAINT "CHK_order_requests_status" CHECK ("status" IN ('REQUESTED', 'APPROVED', 'REJECTED'))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_order_requests_active_unique" ON ${q}."order_requests" ("tenant_id", "order_id", "type") WHERE "status" = 'REQUESTED'`);
  }

  private quote(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
