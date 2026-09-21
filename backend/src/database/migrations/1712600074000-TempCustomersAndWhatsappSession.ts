import { MigrationInterface, QueryRunner } from 'typeorm';

export class TempCustomersAndWhatsappSession1712600074000 implements MigrationInterface {
  name = 'TempCustomersAndWhatsappSession1712600074000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "temp_customers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "mobile" varchar(20) NOT NULL,
        "name" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_temp_customers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_temp_customers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_temp_customers_tenant_mobile" UNIQUE ("tenant_id", "mobile")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions" DROP CONSTRAINT IF EXISTS "UQ_whatsapp_order_sessions_tenant_customer"
    `);

    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions"
      ADD COLUMN IF NOT EXISTS "temp_customer_id" uuid
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "whatsapp_order_sessions"
        ADD CONSTRAINT "FK_whatsapp_order_sessions_temp_customer"
        FOREIGN KEY ("temp_customer_id") REFERENCES "temp_customers"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions" ALTER COLUMN "customer_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "whatsapp_order_sessions"
        ADD CONSTRAINT "chk_whatsapp_order_sessions_one_retailer"
        CHECK (
          ("customer_id" IS NOT NULL)::int + ("temp_customer_id" IS NOT NULL)::int = 1
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_whatsapp_order_sessions_tenant_customer"
      ON "whatsapp_order_sessions" ("tenant_id", "customer_id")
      WHERE "customer_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_whatsapp_order_sessions_tenant_temp"
      ON "whatsapp_order_sessions" ("tenant_id", "temp_customer_id")
      WHERE "temp_customer_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_whatsapp_order_sessions_tenant_temp"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_whatsapp_order_sessions_tenant_customer"`);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions" DROP CONSTRAINT IF EXISTS "chk_whatsapp_order_sessions_one_retailer"
    `);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions" DROP CONSTRAINT IF EXISTS "FK_whatsapp_order_sessions_temp_customer"
    `);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions" DROP COLUMN IF EXISTS "temp_customer_id"
    `);
    await queryRunner.query(`
      DELETE FROM "whatsapp_order_sessions" WHERE "customer_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions" ALTER COLUMN "customer_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions"
      ADD CONSTRAINT "UQ_whatsapp_order_sessions_tenant_customer" UNIQUE ("tenant_id", "customer_id")
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "temp_customers"`);
  }
}
