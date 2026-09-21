import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogIndustryLevelAndProductCategories1712600027000 implements MigrationInterface {
  name = 'CatalogIndustryLevelAndProductCategories1712600027000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN IF NOT EXISTS "industry_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD CONSTRAINT "FK_categories_industry"
      FOREIGN KEY ("industry_id") REFERENCES "industries"("industry_id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN IF NOT EXISTS "level" smallint NOT NULL DEFAULT 1
    `);

    await queryRunner.query(`
      WITH RECURSIVE tree AS (
        SELECT id, parent_id, 1::smallint AS lvl
        FROM categories
        WHERE parent_id IS NULL AND deleted_at IS NULL
        UNION ALL
        SELECT c.id, c.parent_id, (t.lvl + 1)::smallint
        FROM categories c
        INNER JOIN tree t ON c.parent_id = t.id
        WHERE c.deleted_at IS NULL
      )
      UPDATE categories c
      SET level = tree.lvl
      FROM tree
      WHERE c.id = tree.id AND c.deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_categories_industry_id"
      ON "categories" ("industry_id")
      WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_categories_parent_id"
      ON "categories" ("parent_id")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "product_categories" (
        "product_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        CONSTRAINT "PK_product_categories" PRIMARY KEY ("product_id", "category_id"),
        CONSTRAINT "FK_product_categories_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_product_categories_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_product_categories_category_id"
      ON "product_categories" ("category_id")
    `);

    await queryRunner.query(`
      INSERT INTO "product_categories" ("product_id", "category_id")
      SELECT "id", "category_id" FROM "products" WHERE "deleted_at" IS NULL
      ON CONFLICT ("product_id", "category_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "product_categories"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categories_parent_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categories_industry_id"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_categories_industry"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "level"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "industry_id"`);
  }
}
