import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCatalogCoreSchema1712600002000 implements MigrationInterface {
  name = 'AddCatalogCoreSchema1712600002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NULL,
        "name" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL,
        "parent_id" uuid NULL,
        "status" varchar(32) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_categories_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_categories_tenant_slug_unique"
      ON "categories" ("tenant_id", "slug")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attributes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NULL,
        "name" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL,
        "data_type" varchar(64) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "PK_attributes_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_attributes_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_attributes_tenant_slug_unique"
      ON "attributes" ("tenant_id", "slug")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attribute_values" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "attribute_id" uuid NOT NULL,
        "value" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "PK_attribute_values_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_attribute_values_attribute" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_attribute_values_attr_slug_unique"
      ON "attribute_values" ("attribute_id", "slug")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "slug" varchar(255) NOT NULL,
        "sku" varchar(128) NOT NULL,
        "description" text NOT NULL,
        "category_id" uuid NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "mrp" numeric(12,2) NOT NULL,
        "tax_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        "brand" varchar(255) NULL,
        "weight" numeric(12,3) NULL,
        "dimensions" varchar(255) NULL,
        "hsn_code" varchar(32) NULL,
        "barcode" varchar(64) NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_products_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_products_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_products_tenant_sku_unique"
      ON "products" ("tenant_id", "sku")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_products_tenant_slug_unique"
      ON "products" ("tenant_id", "slug")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_name_search"
      ON "products" USING gin (to_tsvector('simple', "name"))
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_variants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "variant_sku" varchar(128) NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "mrp" numeric(12,2) NOT NULL,
        "stock_quantity" int NOT NULL DEFAULT 0,
        "attributes_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" varchar(32) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ NULL,
        CONSTRAINT "PK_product_variants_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_variants_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_product_variants_sku_unique"
      ON "product_variants" ("variant_sku")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_product_variants_search_sku"
      ON "product_variants" ("variant_sku")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_images" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "image_url" text NOT NULL,
        "is_thumbnail" boolean NOT NULL DEFAULT false,
        "position" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_images_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_product_images_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_product_images_product_position"
      ON "product_images" ("product_id", "position")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_id" uuid NOT NULL,
        "variant_id" uuid NULL,
        "stock_quantity" int NOT NULL DEFAULT 0,
        "low_stock_threshold" int NOT NULL DEFAULT 0,
        "stock_status" varchar(32) NOT NULL DEFAULT 'OUT_OF_STOCK',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inventory_variant" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE,
        CONSTRAINT "CK_inventory_non_negative_stock" CHECK ("stock_quantity" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_inventory_product_variant_unique"
      ON "inventory" ("product_id", "variant_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "catalog_audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NULL,
        "user_id" uuid NULL,
        "event_type" varchar(64) NOT NULL,
        "entity_type" varchar(64) NOT NULL,
        "entity_id" uuid NOT NULL,
        "old_value" jsonb NULL,
        "new_value" jsonb NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_catalog_audit_logs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_catalog_audit_logs_tenant_event_created"
      ON "catalog_audit_logs" ("tenant_id", "event_type", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_catalog_audit_logs_entity"
      ON "catalog_audit_logs" ("entity_type", "entity_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_catalog_audit_logs_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_catalog_audit_logs_tenant_event_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "catalog_audit_logs"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventory_product_variant_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_images_product_position"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_images"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_variants_search_sku"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_product_variants_sku_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_variants"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_name_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_tenant_slug_unique"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_tenant_sku_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_attribute_values_attr_slug_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attribute_values"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_attributes_tenant_slug_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attributes"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_tenant_slug_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
  }
}
