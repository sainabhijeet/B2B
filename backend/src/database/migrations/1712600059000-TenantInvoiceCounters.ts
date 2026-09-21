import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Concurrency-safe per-tenant, per–India-FY invoice sequence (public DB).
 * Optional padding on `invoice_settings` for zero-padding width.
 */
export class TenantInvoiceCounters1712600059000 implements MigrationInterface {
  name = 'TenantInvoiceCounters1712600059000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_invoice_counters" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "financial_year" varchar(16) NOT NULL,
        "next_number" integer NOT NULL DEFAULT 1,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_invoice_counters" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_invoice_counters_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_tenant_invoice_counters_tenant_fy" UNIQUE ("tenant_id", "financial_year")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tenant_invoice_counters_tenant_id"
      ON "tenant_invoice_counters" ("tenant_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "invoice_settings"
      ADD COLUMN IF NOT EXISTS "counter_padding" integer NOT NULL DEFAULT 4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoice_settings" DROP COLUMN IF EXISTS "counter_padding"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_invoice_counters"`);
  }
}
