import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Corrects the canonical column name to reflect the legacy table's key shape. */
export class CorrectCanonicalThemeDeploymentSettingsKey1712600090000 implements MigrationInterface {
  name = 'CorrectCanonicalThemeDeploymentSettingsKey1712600090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'theme_deployments'
            AND column_name = 'legacy_tenant_theme_settings_id'
        ) THEN
          ALTER TABLE "theme_deployments"
          DROP CONSTRAINT IF EXISTS "FK_theme_deployments_legacy_settings";
          ALTER TABLE "theme_deployments"
          RENAME COLUMN "legacy_tenant_theme_settings_id" TO "legacy_tenant_theme_settings_tenant_id";
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'theme_deployments'
            AND column_name = 'legacy_tenant_theme_settings_tenant_id'
        ) THEN
          ALTER TABLE "theme_deployments"
          DROP CONSTRAINT IF EXISTS "FK_theme_deployments_legacy_settings_tenant";
          ALTER TABLE "theme_deployments"
          ADD CONSTRAINT "FK_theme_deployments_legacy_settings_tenant"
          FOREIGN KEY ("legacy_tenant_theme_settings_tenant_id")
          REFERENCES "tenant_theme_settings"("tenant_id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'theme_deployments'
            AND column_name = 'legacy_tenant_theme_settings_tenant_id'
        ) THEN
          ALTER TABLE "theme_deployments"
          DROP CONSTRAINT IF EXISTS "FK_theme_deployments_legacy_settings_tenant";
          ALTER TABLE "theme_deployments"
          RENAME COLUMN "legacy_tenant_theme_settings_tenant_id" TO "legacy_tenant_theme_settings_id";
          ALTER TABLE "theme_deployments"
          ADD CONSTRAINT "FK_theme_deployments_legacy_settings"
          FOREIGN KEY ("legacy_tenant_theme_settings_id")
          REFERENCES "tenant_theme_settings"("tenant_id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }
}
