import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductSeoCostTagsVariantImage1712600044000 implements MigrationInterface {
  name = 'ProductSeoCostTagsVariantImage1712600044000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "meta_title" character varying(255) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "meta_description" text NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "meta_keywords" character varying(512) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "cost_price" numeric(12,2) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "product_images"
      ADD COLUMN IF NOT EXISTS "variant_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "product_images"
      ADD CONSTRAINT "FK_product_images_variant"
      FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_images_variant_id" ON "product_images" ("variant_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT IF EXISTS "FK_product_images_variant"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_images_variant_id"`);
    await queryRunner.query(`ALTER TABLE "product_images" DROP COLUMN IF EXISTS "variant_id"`);

    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "tags"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "cost_price"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "meta_keywords"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "meta_description"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "meta_title"`);
  }
}
