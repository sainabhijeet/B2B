import { MigrationInterface, QueryRunner } from 'typeorm';

/** Persist secondary brand color beside the selected tenant theme. */
export class TenantThemeSettingsSecondaryColor1712600087000 implements MigrationInterface {
  name = 'TenantThemeSettingsSecondaryColor1712600087000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_theme_settings" ADD COLUMN IF NOT EXISTS "secondary_color" character varying(32)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_theme_settings" DROP COLUMN IF EXISTS "secondary_color"`,
    );
  }
}
