import type { MigrationInterface, QueryRunner } from 'typeorm';

const JEW_WEB = 'f0000001-0000-4000-8000-000000000001';
const ELE_WEB = 'f0000002-0000-4000-8000-000000000002';
const JEW_MOBILE = 'f0000001-0000-4000-8000-000000000101';
const ELE_MOBILE = 'f0000002-0000-4000-8000-000000000102';
const COMBO_JEW = 'c0000001-0000-4000-8000-000000000001';
const COMBO_ELE = 'c0000002-0000-4000-8000-000000000002';

export class ThemeWebMobileComboTenantSettings1712600037000 implements MigrationInterface {
  name = 'ThemeWebMobileComboTenantSettings1712600037000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD COLUMN IF NOT EXISTS "slug" character varying(128) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD COLUMN IF NOT EXISTS "theme_channel" character varying(16) NOT NULL DEFAULT 'WEB'
    `);
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD CONSTRAINT "CHK_themes_theme_channel"
      CHECK ("theme_channel" IN ('WEB', 'MOBILE'))
    `);
    await queryRunner.query(`
      ALTER TABLE "themes"
      ADD COLUMN IF NOT EXISTS "preview_image" character varying(512) NULL
    `);

    await queryRunner.query(`
      UPDATE "themes"
      SET
        "slug" = "theme_type" || '-web',
        "theme_channel" = 'WEB'
      WHERE "slug" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_themes_slug"
      ON "themes" ("slug")
      WHERE "slug" IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT INTO "themes" ("id", "theme_name", "theme_type", "theme_config_json", "status", "created_at", "slug", "theme_channel", "preview_image")
      VALUES
      (
        '${JEW_MOBILE}'::uuid,
        'Jewellery',
        'jewellery',
        '{"demoHost":"jewellery-app-demo.platform.local","description":"Mobile shell for Jewellery storefront."}'::jsonb,
        'ACTIVE',
        now(),
        'jewellery-mobile',
        'MOBILE',
        NULL
      ),
      (
        '${ELE_MOBILE}'::uuid,
        'Electronics',
        'electronics',
        '{"demoHost":"electronics-app-demo.platform.local","description":"Mobile shell for Electronics storefront."}'::jsonb,
        'ACTIVE',
        now(),
        'electronics-mobile',
        'MOBILE',
        NULL
      )
      ON CONFLICT ("id") DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_combo_mapping" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "web_theme_id" uuid NOT NULL,
        "mobile_theme_id" uuid NOT NULL,
        "name" character varying(128) NOT NULL,
        "preview_image" character varying(512) NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_combo_mapping" PRIMARY KEY ("id"),
        CONSTRAINT "FK_combo_web_theme" FOREIGN KEY ("web_theme_id") REFERENCES "themes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_combo_mobile_theme" FOREIGN KEY ("mobile_theme_id") REFERENCES "themes"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_theme_combo_web_mobile" UNIQUE ("web_theme_id", "mobile_theme_id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "theme_combo_mapping" ("id", "web_theme_id", "mobile_theme_id", "name", "preview_image")
      VALUES
        ('${COMBO_JEW}'::uuid, '${JEW_WEB}'::uuid, '${JEW_MOBILE}'::uuid, 'Jewellery Pack', NULL),
        ('${COMBO_ELE}'::uuid, '${ELE_WEB}'::uuid, '${ELE_MOBILE}'::uuid, 'Electronics Pack', NULL)
      ON CONFLICT ("id") DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_theme_settings" (
        "tenant_id" uuid NOT NULL,
        "web_theme_id" uuid NOT NULL,
        "mobile_theme_id" uuid NULL,
        "primary_color" character varying(32) NULL,
        "logo_url" text NULL,
        "combo_id" uuid NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_theme_settings" PRIMARY KEY ("tenant_id"),
        CONSTRAINT "FK_tts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tts_web" FOREIGN KEY ("web_theme_id") REFERENCES "themes"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tts_mobile" FOREIGN KEY ("mobile_theme_id") REFERENCES "themes"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_tts_combo" FOREIGN KEY ("combo_id") REFERENCES "theme_combo_mapping"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tenant_theme_settings_web" ON "tenant_theme_settings" ("web_theme_id")
    `);

    await queryRunner.query(`
      INSERT INTO "tenant_theme_settings" ("tenant_id", "web_theme_id", "mobile_theme_id", "primary_color", "logo_url", "combo_id")
      SELECT
        tt."tenant_id",
        tt."theme_id",
        c."mobile_theme_id",
        NULL,
        NULL,
        c."id"
      FROM "tenant_themes" tt
      INNER JOIN "theme_combo_mapping" c ON c."web_theme_id" = tt."theme_id"
      ON CONFLICT ("tenant_id") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "tenant_theme_settings" ("tenant_id", "web_theme_id", "mobile_theme_id", "primary_color", "logo_url", "combo_id")
      SELECT
        tt."tenant_id",
        tt."theme_id",
        NULL,
        NULL,
        NULL,
        NULL
      FROM "tenant_themes" tt
      WHERE NOT EXISTS (
        SELECT 1 FROM "tenant_theme_settings" tts WHERE tts."tenant_id" = tt."tenant_id"
      )
      ON CONFLICT ("tenant_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_theme_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_combo_mapping"`);
    await queryRunner.query(
      `DELETE FROM "themes" WHERE "id" IN ('${JEW_MOBILE}'::uuid, '${ELE_MOBILE}'::uuid)`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_themes_slug"`);
    await queryRunner.query(
      `ALTER TABLE "themes" DROP CONSTRAINT IF EXISTS "CHK_themes_theme_channel"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "preview_image"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "theme_channel"`,
    );
    await queryRunner.query(
      `ALTER TABLE "themes" DROP COLUMN IF EXISTS "slug"`,
    );
  }
}
