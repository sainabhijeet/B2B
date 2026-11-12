import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds tenant-scoped customer order requests. This migration is additive and
 * does not alter order, payment, stock, invoice, or fulfillment state.
 */
export class OrderRequests1712600181000 implements MigrationInterface {
  name = 'OrderRequests1712600181000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureTable(queryRunner, 'public');

    const schemas = await this.getProvisionedTenantSchemas(queryRunner);
    for (const schema of schemas) {
      await this.ensureTable(queryRunner, schema);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schemas = await this.getProvisionedTenantSchemas(queryRunner);
    for (const schema of schemas) {
      await this.dropTable(queryRunner, schema);
    }
    await this.dropTable(queryRunner, 'public');
  }

  private async getProvisionedTenantSchemas(
    queryRunner: QueryRunner,
  ): Promise<string[]> {
    const rows: { schema_name: string }[] = await queryRunner.query(`
      SELECT schema_name
      FROM public.tenants
      WHERE schema_name ~ '^t_[a-f0-9]{32}$'
        AND tenant_schema_provisioned = true
        AND to_regnamespace(schema_name) IS NOT NULL
      ORDER BY schema_name
    `);
    return rows.map(({ schema_name }) => schema_name);
  }

  private async ensureTable(
    queryRunner: QueryRunner,
    schema: string,
  ): Promise<void> {
    const qSchema = this.quoteIdent(schema);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${qSchema}."order_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "requested_by" uuid NOT NULL,
        "type" varchar(16) NOT NULL,
        "reason_code" varchar(40) NOT NULL,
        "description" text NULL,
        "photo_urls" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "status" varchar(32) NOT NULL DEFAULT 'REQUESTED',
        "reviewed_by" uuid NULL,
        "review_note" text NULL,
        "reviewed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_requests" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_order_requests_type" CHECK ("type" IN ('REPLACEMENT', 'CANCEL')),
        CONSTRAINT "CHK_order_requests_status" CHECK ("status" IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REPLACEMENT_SHIPPED', 'COMPLETED')),
        CONSTRAINT "FK_order_requests_tenant" FOREIGN KEY ("tenant_id") REFERENCES public."tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_requests_requested_by" FOREIGN KEY ("requested_by") REFERENCES public."users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_order_requests_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES public."users"("id") ON DELETE SET NULL
      )
    `);
    if (schema !== 'public') {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'FK_order_requests_order'
              AND conrelid = '${schema.replace(/'/g, "''")}.order_requests'::regclass
          ) THEN
            ALTER TABLE ${qSchema}."order_requests"
            ADD CONSTRAINT "FK_order_requests_order"
            FOREIGN KEY ("order_id") REFERENCES ${qSchema}."orders"("id") ON DELETE CASCADE;
          END IF;
        END $$;
      `);
    }
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_order_requests_tenant_order_created"
      ON ${qSchema}."order_requests" ("tenant_id", "order_id", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_order_requests_requested_by"
      ON ${qSchema}."order_requests" ("tenant_id", "requested_by")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UX_order_requests_active_order"
      ON ${qSchema}."order_requests" ("tenant_id", "order_id")
      WHERE "status" IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REPLACEMENT_SHIPPED')
    `);
  }

  private async dropTable(
    queryRunner: QueryRunner,
    schema: string,
  ): Promise<void> {
    const qSchema = this.quoteIdent(schema);
    await queryRunner.query(
      `DROP INDEX IF EXISTS ${qSchema}."UX_order_requests_active_order"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS ${qSchema}."IDX_order_requests_requested_by"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS ${qSchema}."IDX_order_requests_tenant_order_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS ${qSchema}."order_requests"`);
  }

  private quoteIdent(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
