import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Deterministic IDs so distributor panel and onboarding can reference seeded rows. */
export const STOREFRONT_THEME_IDS = {
  jewellery: 'f0000001-0000-4000-8000-000000000001',
  electronics: 'f0000002-0000-4000-8000-000000000002',
} as const;

export class SeedDefaultStorefrontThemes1712600036000 implements MigrationInterface {
  name = 'SeedDefaultStorefrontThemes1712600036000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "themes" ("id", "theme_name", "theme_type", "theme_config_json", "status", "created_at")
      VALUES
      (
        '${STOREFRONT_THEME_IDS.jewellery}'::uuid,
        'Jewellery',
        'jewellery',
        '{"demoHost":"jewellery-demo.platform.local","description":"Luxury-forward storefront: hero, collections, trust."}'::jsonb,
        'ACTIVE',
        now()
      ),
      (
        '${STOREFRONT_THEME_IDS.electronics}'::uuid,
        'Electronics',
        'electronics',
        '{"demoHost":"electronics-demo.platform.local","description":"SKU-first layout: specs, compare, offers."}'::jsonb,
        'ACTIVE',
        now()
      )
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "tenant_themes"
      WHERE "theme_id" IN (
        '${STOREFRONT_THEME_IDS.jewellery}'::uuid,
        '${STOREFRONT_THEME_IDS.electronics}'::uuid
      )
    `);
    await queryRunner.query(`
      DELETE FROM "themes"
      WHERE "id" IN (
        '${STOREFRONT_THEME_IDS.jewellery}'::uuid,
        '${STOREFRONT_THEME_IDS.electronics}'::uuid
      )
    `);
  }
}
