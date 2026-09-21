import type { MigrationInterface, QueryRunner } from 'typeorm';

export class B2bVariantPricingTables1712600051000 implements MigrationInterface {
  name = 'B2bVariantPricingTables1712600051000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "PK_customer_groups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_customer_groups_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_customer_groups_tenant_name_unique"
      ON "customer_groups" ("tenant_id", "name")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_groups_tenant_id" ON "customer_groups" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_group_map" (
        "customer_id" uuid NOT NULL,
        "group_id" uuid NOT NULL,
        CONSTRAINT "PK_customer_group_map" PRIMARY KEY ("customer_id", "group_id"),
        CONSTRAINT "FK_customer_group_map_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_customer_group_map_group" FOREIGN KEY ("group_id") REFERENCES "customer_groups"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_group_map_group_id" ON "customer_group_map" ("group_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_prices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "product_variant_id" uuid NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_prices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_customer_prices_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_customer_prices_variant" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_customer_prices_customer_variant" UNIQUE ("customer_id", "product_variant_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customer_prices_variant_id" ON "customer_prices" ("product_variant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "group_prices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "group_id" uuid NOT NULL,
        "product_variant_id" uuid NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_group_prices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_group_prices_group" FOREIGN KEY ("group_id") REFERENCES "customer_groups"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_group_prices_variant" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_group_prices_group_variant" UNIQUE ("group_id", "product_variant_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_group_prices_variant_id" ON "group_prices" ("product_variant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "quantity_prices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_variant_id" uuid NOT NULL,
        "min_qty" integer NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quantity_prices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quantity_prices_variant" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_quantity_prices_variant_min_qty" UNIQUE ("product_variant_id", "min_qty"),
        CONSTRAINT "CHK_quantity_prices_min_qty" CHECK ("min_qty" >= 1)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_quantity_prices_variant_id" ON "quantity_prices" ("product_variant_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "quantity_prices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "group_prices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_prices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_group_map"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customer_groups_tenant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_customer_groups_tenant_name_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_groups"`);
  }
}
