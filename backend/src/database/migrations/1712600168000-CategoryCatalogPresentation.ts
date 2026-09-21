import { MigrationInterface, QueryRunner } from 'typeorm';

export class CategoryCatalogPresentation1712600168000 implements MigrationInterface {
  name = 'CategoryCatalogPresentation1712600168000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "icon_url" text`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "banner_url" text`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "thumbnail_url" text`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "show_in_app" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "show_in_website" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "show_in_menu" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_categories_global_slug_unique" ON "categories" (LOWER("slug")) WHERE "tenant_id" IS NULL AND "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_categories_scope_sort" ON "categories" ("tenant_id", "sort_order", "name") WHERE "deleted_at" IS NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_scope_sort"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_global_slug_unique"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "show_in_menu"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "show_in_website"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "show_in_app"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "thumbnail_url"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "banner_url"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "icon_url"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "sort_order"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "description"`);
  }
}
