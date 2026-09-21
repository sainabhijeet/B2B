import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hybrid brand model: `public.master_brands` (platform) + per-tenant `brands`
 * (shadow rows linked via `master_brand_id` or fully custom brands).
 * `products.brand_id` → tenant `brands.id`; legacy `products.brand` text kept for display/search.
 */
export class MasterBrandsAndTenantBrands1712600054000 implements MigrationInterface {
  name = 'MasterBrandsAndTenantBrands1712600054000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "master_brands" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(255) NOT NULL,
        "logo_url" character varying(512),
        "industry_id" uuid,
        "status" character varying(32) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_master_brands" PRIMARY KEY ("id"),
        CONSTRAINT "FK_master_brands_industry" FOREIGN KEY ("industry_id")
          REFERENCES "industries"("industry_id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_master_brands_slug_ci"
      ON "master_brands" (lower("slug"))
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "brands" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "master_brand_id" uuid,
        "name" character varying(255) NOT NULL,
        "slug" character varying(255) NOT NULL,
        "logo_url" character varying(512),
        "description" text,
        "status" character varying(32) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_brands" PRIMARY KEY ("id"),
        CONSTRAINT "FK_brands_master_brand" FOREIGN KEY ("master_brand_id")
          REFERENCES "master_brands"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_brands_slug_ci"
      ON "brands" (lower("slug"))
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_brands_master_shadow"
      ON "brands" ("master_brand_id")
      WHERE "master_brand_id" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "brand_id" uuid
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "products"
        ADD CONSTRAINT "FK_products_brand_public"
        FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    const seedRows = [
      ['Samsung', 'samsung'],
      ['Apple', 'apple'],
      ['Sony', 'sony'],
      ['Nike', 'nike'],
      ['Adidas', 'adidas'],
    ];
    for (const [name, slug] of seedRows) {
      await queryRunner.query(
        `INSERT INTO "master_brands" ("name", "slug", "status")
         SELECT $1::varchar, $2::varchar, 'active'
         WHERE NOT EXISTS (SELECT 1 FROM "master_brands" mb WHERE lower(mb.slug) = lower($2::varchar))`,
        [name, slug],
      );
    }

    const tenants: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of tenants) {
      const qSch = `"${schema.replace(/"/g, '""')}"`;
      const tbl: { reg: string | null }[] = await queryRunner.query(
        `SELECT to_regclass($1) AS reg`,
        [`${schema}.brands`],
      );
      if (!tbl[0]?.reg) {
        await queryRunner.query(`CREATE TABLE ${qSch}."brands" (LIKE public.brands INCLUDING ALL)`);
      }
      const prodTbl: { reg: string | null }[] = await queryRunner.query(
        `SELECT to_regclass($1) AS reg`,
        [`${schema}.products`],
      );
      if (!prodTbl[0]?.reg) continue;
      await queryRunner.query(`
        ALTER TABLE ${qSch}."products"
        ADD COLUMN IF NOT EXISTS "brand_id" uuid
      `);
      await queryRunner.query(`
        DO $blk$
        BEGIN
          ALTER TABLE ${qSch}."products"
          ADD CONSTRAINT "FK_products_brand"
          FOREIGN KEY ("brand_id") REFERENCES ${qSch}."brands"("id") ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $blk$
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tenants: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of tenants) {
      const qSch = `"${schema.replace(/"/g, '""')}"`;
      await queryRunner.query(`
        ALTER TABLE ${qSch}."products" DROP CONSTRAINT IF EXISTS "FK_products_brand"
      `);
      await queryRunner.query(`
        ALTER TABLE ${qSch}."products" DROP COLUMN IF EXISTS "brand_id"
      `);
      await queryRunner.query(`DROP TABLE IF EXISTS ${qSch}."brands"`);
    }
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_products_brand_public"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "brand_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brands"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "master_brands"`);
  }
}
