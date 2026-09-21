import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderPayments1712600004000 implements MigrationInterface {
  name = 'AddOrderPayments1712600004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "payment_reference" varchar(128) NOT NULL,
        "payment_screenshot_url" text NOT NULL,
        "payment_note" text NULL,
        "status" varchar(32) NOT NULL DEFAULT 'UPLOADED',
        "uploaded_by" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_payments_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_payments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_payments_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_payments_order_unique"
      ON "order_payments" ("order_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_payments_order_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_payments"`);
  }
}
