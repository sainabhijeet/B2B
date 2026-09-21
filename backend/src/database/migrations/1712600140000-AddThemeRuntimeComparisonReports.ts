import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThemeRuntimeComparisonReports1712600140000 implements MigrationInterface {
  name = 'AddThemeRuntimeComparisonReports1712600140000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_runtime_comparison_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "request_id" varchar(160) NOT NULL,
        "tenant_id" uuid,
        "channel" varchar(16) NOT NULL,
        "legacy_response_hash" char(64) NOT NULL,
        "canonical_response_hash" char(64),
        "legacy_duration_ms" integer,
        "canonical_duration_ms" integer,
        "status" varchar(32) NOT NULL,
        "report_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_runtime_comparison_reports" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_theme_runtime_comparison_reports_request" UNIQUE ("request_id"),
        CONSTRAINT "CHK_theme_runtime_comparison_reports_channel" CHECK ("channel" IN ('WEB', 'MOBILE')),
        CONSTRAINT "CHK_theme_runtime_comparison_reports_status" CHECK ("status" IN ('MATCH', 'DIFFERENT', 'UNAVAILABLE', 'ERROR'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_runtime_comparison_reports_scope_created" ON "theme_runtime_comparison_reports" ("tenant_id", "channel", "created_at" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_runtime_comparison_reports_scope_created"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "theme_runtime_comparison_reports"`,
    );
  }
}
