import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantAppSettingsSelectedLanguage1712600088000 implements MigrationInterface {
  name = 'TenantAppSettingsSelectedLanguage1712600088000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_app_settings"
      ADD COLUMN IF NOT EXISTS "selected_language_code" character varying(16) NOT NULL DEFAULT 'en'
    `);

    await queryRunner.query(`
      UPDATE "tenant_app_settings" s
      SET "selected_language_code" = COALESCE(
        NULLIF(lower(regexp_replace(o."payload_json" ->> 'selectedLanguageCode', '[^a-z-]', '', 'g')), ''),
        NULLIF(lower(regexp_replace(o."payload_json" -> 'languages' ->> 0, '[^a-z-]', '', 'g')), ''),
        'en'
      )
      FROM "tenant_onboarding" o
      WHERE o."tenant_id" = s."tenant_id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_app_settings"
      DROP COLUMN IF EXISTS "selected_language_code"
    `);
  }
}
