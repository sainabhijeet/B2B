import { MigrationInterface, QueryRunner } from 'typeorm';

/** Feature flags + home UI for mobile / storefront (tenant_app_settings). */
export class TenantAppSettingsAppConfigFlags1712600085000 implements MigrationInterface {
  name = 'TenantAppSettingsAppConfigFlags1712600085000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_app_settings" ADD COLUMN "enable_repeat_order" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_app_settings" ADD COLUMN "enable_credit_view" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_app_settings" ADD COLUMN "enable_notifications" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_app_settings" ADD COLUMN "default_home_layout" character varying(16) NOT NULL DEFAULT 'grid'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_app_settings" ADD COLUMN "show_banner" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`
      ALTER TABLE "tenant_app_settings"
        ADD CONSTRAINT "CHK_tenant_app_settings_home_layout"
        CHECK ("default_home_layout" IN ('grid', 'list'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_app_settings" DROP CONSTRAINT IF EXISTS "CHK_tenant_app_settings_home_layout"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_app_settings" DROP COLUMN IF EXISTS "show_banner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_app_settings" DROP COLUMN IF EXISTS "default_home_layout"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_app_settings" DROP COLUMN IF EXISTS "enable_notifications"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_app_settings" DROP COLUMN IF EXISTS "enable_credit_view"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_app_settings" DROP COLUMN IF EXISTS "enable_repeat_order"`,
    );
  }
}
