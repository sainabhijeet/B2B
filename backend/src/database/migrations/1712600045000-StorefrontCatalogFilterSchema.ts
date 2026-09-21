import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StorefrontCatalogFilterSchema1712600045000 implements MigrationInterface {
  name = 'StorefrontCatalogFilterSchema1712600045000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_categories" (
        "product_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        CONSTRAINT "PK_product_categories" PRIMARY KEY ("product_id", "category_id"),
        CONSTRAINT "FK_pc_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pc_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_categories_category_id"
      ON "product_categories" ("category_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_variant_attribute_values" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "product_variant_id" uuid NOT NULL,
        "attribute_value_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_product_variant_attribute_values" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pvav_variant_value" UNIQUE ("product_variant_id", "attribute_value_id"),
        CONSTRAINT "FK_pvav_variant" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pvav_attribute_value" FOREIGN KEY ("attribute_value_id") REFERENCES "attribute_values"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pvav_variant_id"
      ON "product_variant_attribute_values" ("product_variant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pvav_attribute_value_id"
      ON "product_variant_attribute_values" ("attribute_value_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_variants_product_id"
      ON "product_variants" ("product_id")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inventory_variant_id"
      ON "inventory" ("variant_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_variants_attributes_json_gin"
      ON "product_variants" USING gin ("attributes_json")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_variants_attributes_json_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inventory_variant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_variants_product_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_variant_attribute_values"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_categories_category_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "product_categories"`);
  }
}
