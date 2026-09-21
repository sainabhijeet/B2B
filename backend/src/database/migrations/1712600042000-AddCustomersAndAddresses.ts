import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomersAndAddresses1712600042000 implements MigrationInterface {
  name = 'AddCustomersAndAddresses1712600042000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "mobile" character varying(20) NOT NULL,
        "email" character varying(255) NULL,
        "status" character varying(16) NOT NULL DEFAULT 'ACTIVE',
        "credit_limit" numeric(14,2) NOT NULL DEFAULT 0,
        "credit_balance" numeric(14,2) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "PK_customers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_customers_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_customers_tenant_mobile_unique"
      ON "customers" ("tenant_id", "mobile")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_tenant_id" ON "customers" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_addresses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "label" character varying(64) NULL,
        "line1" character varying(255) NOT NULL,
        "line2" character varying(255) NULL,
        "city" character varying(128) NOT NULL,
        "state" character varying(128) NOT NULL,
        "pincode" character varying(32) NOT NULL,
        "country_code" character varying(2) NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_addresses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_customer_addresses_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_addresses_customer_id" ON "customer_addresses" ("customer_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_addresses"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_tenant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_customers_tenant_mobile_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
  }
}
