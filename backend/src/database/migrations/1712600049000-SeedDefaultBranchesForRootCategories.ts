import { MigrationInterface, QueryRunner } from 'typeorm';

/** Level-2 rows for “fill remaining roots” batch — `down()` deletes this range only. */
function categoryUuidL2Fill(seq: number): string {
  return `20300000-0000-4000-8000-${seq.toString(16).padStart(12, '0')}`;
}

/** Level-3 rows for the same batch. */
function categoryUuidL3Fill(seq: number): string {
  return `20400000-0000-4000-8000-${seq.toString(16).padStart(12, '0')}`;
}

type RootRow = { id: string; slug: string; name: string; industry_id: string | null };

/**
 * For every global root category (`tenant_id` NULL, `parent_id` NULL) that still has **no** children,
 * adds two default L2 branches + one L3 under each (trade-style naming). Skips when slug already exists.
 */
export class SeedDefaultBranchesForRootCategories1712600049000 implements MigrationInterface {
  name = 'SeedDefaultBranchesForRootCategories1712600049000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const roots = (await queryRunner.query(
      `SELECT c."id", c."slug", c."name", c."industry_id"
       FROM "categories" c
       WHERE c."tenant_id" IS NULL
         AND c."parent_id" IS NULL
         AND c."deleted_at" IS NULL
         AND c."level" = 1
       ORDER BY c."slug" ASC`,
    )) as RootRow[];

    let l2Seq = 1;
    let l3Seq = 1;

    for (const root of roots) {
      const [{ c: childCount }] = (await queryRunner.query(
        `SELECT count(*)::int AS c FROM "categories" x
         WHERE x."parent_id" = $1::uuid AND x."deleted_at" IS NULL`,
        [root.id],
      )) as [{ c: number }];

      if (childCount > 0) {
        continue;
      }

      const base = root.slug.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const l2aSlug = `${base}-wholesale`;
      const l2bSlug = `${base}-distribution`;
      const l2aName = `${root.name} — Wholesale`;
      const l2bName = `${root.name} — Distribution`;

      const idL2a = categoryUuidL2Fill(l2Seq++);
      const idL2b = categoryUuidL2Fill(l2Seq++);

      await queryRunner.query(
        `INSERT INTO "categories" ("id", "tenant_id", "name", "slug", "parent_id", "industry_id", "level", "status", "created_at", "updated_at")
         SELECT $1::uuid, NULL, $2::varchar, $3::varchar, p."id", p."industry_id", 2, 'active', now(), now()
         FROM "categories" p
         WHERE p."id" = $4::uuid AND p."deleted_at" IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM "categories" c
             WHERE c."tenant_id" IS NULL AND lower(trim(c."slug")) = lower(trim($3::varchar)) AND c."deleted_at" IS NULL
           )
         LIMIT 1`,
        [idL2a, l2aName, l2aSlug, root.id],
      );

      await queryRunner.query(
        `INSERT INTO "categories" ("id", "tenant_id", "name", "slug", "parent_id", "industry_id", "level", "status", "created_at", "updated_at")
         SELECT $1::uuid, NULL, $2::varchar, $3::varchar, p."id", p."industry_id", 2, 'active', now(), now()
         FROM "categories" p
         WHERE p."id" = $4::uuid AND p."deleted_at" IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM "categories" c
             WHERE c."tenant_id" IS NULL AND lower(trim(c."slug")) = lower(trim($3::varchar)) AND c."deleted_at" IS NULL
           )
         LIMIT 1`,
        [idL2b, l2bName, l2bSlug, root.id],
      );

      const l3aSlug = `${l2aSlug}-standard-line`;
      const l3bSlug = `${l2bSlug}-standard-line`;
      const idL3a = categoryUuidL3Fill(l3Seq++);
      const idL3b = categoryUuidL3Fill(l3Seq++);

      await queryRunner.query(
        `INSERT INTO "categories" ("id", "tenant_id", "name", "slug", "parent_id", "industry_id", "level", "status", "created_at", "updated_at")
         SELECT $1::uuid, NULL, $2::varchar, $3::varchar, p."id", p."industry_id", 3, 'active', now(), now()
         FROM "categories" p
         WHERE p."tenant_id" IS NULL
           AND lower(trim(p."slug")) = lower(trim($4::varchar))
           AND p."level" = 2
           AND p."deleted_at" IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM "categories" c
             WHERE c."tenant_id" IS NULL AND lower(trim(c."slug")) = lower(trim($3::varchar)) AND c."deleted_at" IS NULL
           )
         LIMIT 1`,
        [idL3a, `${l2aName} — Standard line`, l3aSlug, l2aSlug],
      );

      await queryRunner.query(
        `INSERT INTO "categories" ("id", "tenant_id", "name", "slug", "parent_id", "industry_id", "level", "status", "created_at", "updated_at")
         SELECT $1::uuid, NULL, $2::varchar, $3::varchar, p."id", p."industry_id", 3, 'active', now(), now()
         FROM "categories" p
         WHERE p."tenant_id" IS NULL
           AND lower(trim(p."slug")) = lower(trim($4::varchar))
           AND p."level" = 2
           AND p."deleted_at" IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM "categories" c
             WHERE c."tenant_id" IS NULL AND lower(trim(c."slug")) = lower(trim($3::varchar)) AND c."deleted_at" IS NULL
           )
         LIMIT 1`,
        [idL3b, `${l2bName} — Standard line`, l3bSlug, l2bSlug],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "categories" WHERE "id"::text LIKE '20400000-0000-4000-8000-%'`);
    await queryRunner.query(`DELETE FROM "categories" WHERE "id"::text LIKE '20300000-0000-4000-8000-%'`);
  }
}
