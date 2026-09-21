import { MigrationInterface, QueryRunner } from 'typeorm';

const ATTR = {
  size: '30000000-0000-4000-8000-000000000001',
  color: '30000000-0000-4000-8000-000000000002',
  ram: '30000000-0000-4000-8000-000000000003',
  storage: '30000000-0000-4000-8000-000000000004',
  material: '30000000-0000-4000-8000-000000000005',
  weight: '30000000-0000-4000-8000-000000000006',
  packSize: '30000000-0000-4000-8000-000000000007',
  screenSize: '30000000-0000-4000-8000-000000000008',
} as const;

/**
 * Junction tables for demo catalog: which industries / global categories use which attributes.
 * Seeds a small global attribute library + values + links.
 */
export class CatalogAttributeIndustryCategoryLinks1712600050000 implements MigrationInterface {
  name = 'CatalogAttributeIndustryCategoryLinks1712600050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attribute_industries" (
        "attribute_id" uuid NOT NULL,
        "industry_id" uuid NOT NULL,
        CONSTRAINT "PK_attribute_industries" PRIMARY KEY ("attribute_id", "industry_id"),
        CONSTRAINT "FK_ai_attribute" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ai_industry" FOREIGN KEY ("industry_id") REFERENCES "industries"("industry_id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attribute_industries_industry"
      ON "attribute_industries" ("industry_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attribute_categories" (
        "attribute_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        CONSTRAINT "PK_attribute_categories" PRIMARY KEY ("attribute_id", "category_id"),
        CONSTRAINT "FK_ac_attribute" FOREIGN KEY ("attribute_id") REFERENCES "attributes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ac_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_attribute_categories_category"
      ON "attribute_categories" ("category_id")
    `);

    const attrs: [string, string, string, string][] = [
      [ATTR.size, 'Size', 'size', 'select'],
      [ATTR.color, 'Color', 'color', 'select'],
      [ATTR.ram, 'RAM', 'ram', 'select'],
      [ATTR.storage, 'Storage', 'storage', 'select'],
      [ATTR.material, 'Material', 'material', 'select'],
      [ATTR.weight, 'Weight (kg)', 'weight-kg', 'number'],
      [ATTR.packSize, 'Pack size', 'pack-size', 'select'],
      [ATTR.screenSize, 'Screen size (inches)', 'screen-size-inches', 'select'],
    ];

    for (const [id, name, slug, dataType] of attrs) {
      await queryRunner.query(
        `INSERT INTO "attributes" ("id", "tenant_id", "name", "slug", "data_type", "status", "created_at", "updated_at")
         SELECT $1::uuid, NULL, $2::varchar, $3::varchar, $4::varchar, 'active', now(), now()
         WHERE NOT EXISTS (
           SELECT 1 FROM "attributes" a
           WHERE a."tenant_id" IS NULL AND lower(trim(a."slug")) = lower(trim($3::varchar)) AND a."deleted_at" IS NULL
         )`,
        [id, name, slug, dataType],
      );
    }

    const values: [string, string, string][] = [
      [ATTR.size, 'UK 6', 'uk-6'],
      [ATTR.size, 'UK 7', 'uk-7'],
      [ATTR.size, 'UK 8', 'uk-8'],
      [ATTR.size, 'UK 9', 'uk-9'],
      [ATTR.size, 'UK 10', 'uk-10'],
      [ATTR.size, 'UK 11', 'uk-11'],
      [ATTR.color, 'Black', 'black'],
      [ATTR.color, 'White', 'white'],
      [ATTR.color, 'Navy', 'navy'],
      [ATTR.color, 'Red', 'red'],
      [ATTR.color, 'Gold', 'gold'],
      [ATTR.ram, '4 GB', 'ram-4gb'],
      [ATTR.ram, '8 GB', 'ram-8gb'],
      [ATTR.ram, '16 GB', 'ram-16gb'],
      [ATTR.ram, '32 GB', 'ram-32gb'],
      [ATTR.ram, '64 GB', 'ram-64gb'],
      [ATTR.storage, '64 GB', 'storage-64gb'],
      [ATTR.storage, '128 GB', 'storage-128gb'],
      [ATTR.storage, '256 GB', 'storage-256gb'],
      [ATTR.storage, '512 GB', 'storage-512gb'],
      [ATTR.storage, '1 TB', 'storage-1tb'],
      [ATTR.material, 'Leather', 'material-leather'],
      [ATTR.material, 'Cotton', 'material-cotton'],
      [ATTR.material, 'Polyester', 'material-polyester'],
      [ATTR.material, 'Steel', 'material-steel'],
      [ATTR.material, 'Plastic', 'material-plastic'],
      [ATTR.weight, 'Light (under 1 kg)', 'weight-light'],
      [ATTR.weight, 'Medium (1 to 5 kg)', 'weight-medium'],
      [ATTR.weight, 'Heavy (over 5 kg)', 'weight-heavy'],
      [ATTR.packSize, '500 g', 'pack-500g'],
      [ATTR.packSize, '1 kg', 'pack-1kg'],
      [ATTR.packSize, '5 kg', 'pack-5kg'],
      [ATTR.packSize, '10 kg', 'pack-10kg'],
      [ATTR.screenSize, '5.5"', 'screen-5-5'],
      [ATTR.screenSize, '6.1"', 'screen-6-1'],
      [ATTR.screenSize, '6.5"', 'screen-6-5'],
      [ATTR.screenSize, '6.7"', 'screen-6-7'],
      [ATTR.screenSize, '10.1"', 'screen-10-1'],
    ];

    let vSeq = 1;
    for (const [attrId, value, slug] of values) {
      const vid = `30100000-0000-4000-8000-${vSeq.toString(16).padStart(12, '0')}`;
      vSeq += 1;
      await queryRunner.query(
        `INSERT INTO "attribute_values" ("id", "attribute_id", "value", "slug", "status", "created_at", "updated_at")
         SELECT $1::uuid, $2::uuid, $3::varchar, $4::varchar, 'active', now(), now()
         WHERE EXISTS (SELECT 1 FROM "attributes" a WHERE a."id" = $2::uuid AND a."deleted_at" IS NULL)
           AND NOT EXISTS (
             SELECT 1 FROM "attribute_values" v
             WHERE v."attribute_id" = $2::uuid AND lower(trim(v."slug")) = lower(trim($4::varchar)) AND v."deleted_at" IS NULL
           )`,
        [vid, attrId, value, slug],
      );
    }

    const industryLinks: [string, string][] = [
      [ATTR.size, 'Footwear'],
      [ATTR.size, 'Textile'],
      [ATTR.color, 'Electronics'],
      [ATTR.color, 'Footwear'],
      [ATTR.color, 'General Commerce'],
      [ATTR.ram, 'Electronics'],
      [ATTR.ram, 'IT Hardware & Networking Distribution'],
      [ATTR.storage, 'Electronics'],
      [ATTR.storage, 'IT Hardware & Networking Distribution'],
      [ATTR.material, 'Textile'],
      [ATTR.material, 'Plastics & Polymers'],
      [ATTR.weight, 'Industrial Equipment'],
      [ATTR.weight, 'Machinery'],
      [ATTR.packSize, 'FMCG & Packaged Foods'],
      [ATTR.screenSize, 'Electronics'],
    ];

    for (const [attrId, industryName] of industryLinks) {
      await queryRunner.query(
        `INSERT INTO "attribute_industries" ("attribute_id", "industry_id")
         SELECT $1::uuid, i."industry_id"
         FROM "industries" i
         WHERE lower(trim(i."name")) = lower(trim($2::varchar))
           AND NOT EXISTS (
             SELECT 1 FROM "attribute_industries" x
             WHERE x."attribute_id" = $1::uuid AND x."industry_id" = i."industry_id"
           )
         LIMIT 1`,
        [attrId, industryName],
      );
    }

    const categoryLinks: [string, string][] = [
      [ATTR.size, 'sports-footwear'],
      [ATTR.size, 'formal-footwear'],
      [ATTR.size, 'yarn-fiber'],
      [ATTR.color, 'mobile-phones'],
      [ATTR.color, 'laptops-desktops'],
      [ATTR.color, 'sports-footwear'],
      [ATTR.ram, 'mobile-phones'],
      [ATTR.ram, 'laptops-desktops'],
      [ATTR.ram, 'tablets'],
      [ATTR.storage, 'mobile-phones'],
      [ATTR.storage, 'laptops-desktops'],
      [ATTR.material, 'yarn-fiber'],
      [ATTR.material, 'fabrics-rolls'],
      [ATTR.weight, 'material-handling'],
      [ATTR.weight, 'cnc-machine-tools'],
      [ATTR.packSize, 'staples-pulses'],
      [ATTR.packSize, 'snacks-packaged-foods'],
      [ATTR.screenSize, 'mobile-phones'],
      [ATTR.screenSize, 'tablets'],
      [ATTR.screenSize, 'tv-displays'],
    ];

    for (const [attrId, categorySlug] of categoryLinks) {
      await queryRunner.query(
        `INSERT INTO "attribute_categories" ("attribute_id", "category_id")
         SELECT $1::uuid, c."id"
         FROM "categories" c
         WHERE c."tenant_id" IS NULL
           AND lower(trim(c."slug")) = lower(trim($2::varchar))
           AND c."deleted_at" IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM "attribute_categories" x
             WHERE x."attribute_id" = $1::uuid AND x."category_id" = c."id"
           )
         LIMIT 1`,
        [attrId, categorySlug],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const attrIds = Object.values(ATTR);
    await queryRunner.query(
      `DELETE FROM "attributes" WHERE "id" IN (${attrIds.map((_, i) => `$${i + 1}::uuid`).join(', ')})`,
      attrIds,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "attribute_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attribute_industries"`);
  }
}
