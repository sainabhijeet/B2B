import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantThemeChangeHistory1712600055000 implements MigrationInterface {
  name = 'TenantThemeChangeHistory1712600055000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_theme_changes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "previous_web_theme_id" uuid,
        "new_web_theme_id" uuid NOT NULL,
        "previous_mobile_theme_id" uuid,
        "new_mobile_theme_id" uuid,
        "previous_combo_id" uuid,
        "new_combo_id" uuid,
        "changed_by_user_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_theme_changes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ttc_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ttc_user" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tenant_theme_changes_tenant_created"
      ON "tenant_theme_changes" ("tenant_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tenant_theme_changes_tenant_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_theme_changes"`);
  }
}
