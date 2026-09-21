import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantThemeCustomizationTables1712600040000 implements MigrationInterface {
  name = 'TenantThemeCustomizationTables1712600040000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_sections" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "page" character varying(64) NOT NULL,
        "section_key" character varying(128) NOT NULL,
        "settings_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "order_index" integer NOT NULL DEFAULT 0,
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_sections" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_sections_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_tenant_sections_page_key" UNIQUE ("tenant_id", "page", "section_key")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tenant_sections_tenant_page"
      ON "tenant_sections" ("tenant_id", "page")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_theme_tokens" (
        "tenant_id" uuid NOT NULL,
        "tokens_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_theme_tokens" PRIMARY KEY ("tenant_id"),
        CONSTRAINT "FK_tenant_theme_tokens_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_theme_tokens"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tenant_sections_tenant_page"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_sections"`);
  }
}
