import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OrderReturnWorkflow1712600162000 implements MigrationInterface {
  name = 'OrderReturnWorkflow1712600162000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createTable(queryRunner, 'public');
    const tenants: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const tenant of tenants) {
      await this.createTable(queryRunner, tenant.schema_name);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tenants: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const tenant of tenants) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${this.quote(tenant.schema_name)}."order_requests"`);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS public."order_requests"`);
  }

  private async createTable(queryRunner: QueryRunner, schema: string): Promise<void> {
    const q = this.quote(schema);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${q}."order_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "requested_by" uuid NOT NULL,
        "type" varchar(16) NOT NULL,
        "reason" text NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'REQUESTED',
        "reviewed_by" uuid NULL,
        "review_note" text NULL,
        "reviewed_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_requests" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_order_requests_type" CHECK ("type" IN ('RETURN', 'CANCEL')),
        CONSTRAINT "CHK_order_requests_status" CHECK ("status" IN ('REQUESTED', 'APPROVED', 'REJECTED')),
        CONSTRAINT "FK_order_requests_tenant" FOREIGN KEY ("tenant_id") REFERENCES public."tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_requests_order" FOREIGN KEY ("order_id") REFERENCES ${q}."orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_requests_requested_by" FOREIGN KEY ("requested_by") REFERENCES public."users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_order_requests_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES public."users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_requests_active_unique"
      ON ${q}."order_requests" ("tenant_id", "order_id", "type")
      WHERE "status" = 'REQUESTED'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_order_requests_tenant_order_created"
      ON ${q}."order_requests" ("tenant_id", "order_id", "created_at" DESC)
    `);
  }

  private quote(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
