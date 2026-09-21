import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Phase 3 additive release intake, validation report, and history schema. */
export class AddThemeReleaseValidationPipeline1712600110000 implements MigrationInterface {
  name = 'AddThemeReleaseValidationPipeline1712600110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_release_candidates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "idempotency_key" character varying(128) NOT NULL,
        "family_slug" character varying(128) NOT NULL,
        "channel" character varying(16) NOT NULL,
        "version" character varying(32) NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'QUARANTINED',
        "quarantine_key" character varying(512) NOT NULL,
        "package_sha256" character(64),
        "package_size_bytes" bigint,
        "manifest_version" character varying(32),
        "manifest_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "release_metadata_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "validation_report_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "compatibility_score" smallint,
        "security_score" smallint,
        "performance_score" smallint,
        "preview_manifest_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "preview_key" character varying(512),
        "validation_run_count" integer NOT NULL DEFAULT 0,
        "validated_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_release_candidates" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_theme_release_candidates_idempotency" UNIQUE ("idempotency_key"),
        CONSTRAINT "UQ_theme_release_candidates_release_key" UNIQUE ("family_slug", "channel", "version"),
        CONSTRAINT "CHK_theme_release_candidates_channel" CHECK ("channel" IN ('WEB', 'MOBILE')),
        CONSTRAINT "CHK_theme_release_candidates_status" CHECK ("status" IN ('QUARANTINED', 'VALIDATING', 'REJECTED', 'VALIDATED', 'APPROVAL_READY', 'APPROVED', 'ARCHIVED')),
        CONSTRAINT "CHK_theme_release_candidates_scores" CHECK (
          ("compatibility_score" IS NULL OR "compatibility_score" BETWEEN 0 AND 100) AND
          ("security_score" IS NULL OR "security_score" BETWEEN 0 AND 100) AND
          ("performance_score" IS NULL OR "performance_score" BETWEEN 0 AND 100)
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_theme_release_candidates_status_created"
      ON "theme_release_candidates" ("status", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_release_validation_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "candidate_id" uuid NOT NULL,
        "run_key" character varying(128) NOT NULL,
        "status" character varying(32) NOT NULL,
        "report_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "package_sha256" character(64),
        "compatibility_score" smallint,
        "security_score" smallint,
        "performance_score" smallint,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_release_validation_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_release_validation_history_candidate" FOREIGN KEY ("candidate_id") REFERENCES "theme_release_candidates"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_theme_release_validation_history_run" UNIQUE ("candidate_id", "run_key"),
        CONSTRAINT "CHK_theme_release_validation_history_scores" CHECK (
          ("compatibility_score" IS NULL OR "compatibility_score" BETWEEN 0 AND 100) AND
          ("security_score" IS NULL OR "security_score" BETWEEN 0 AND 100) AND
          ("performance_score" IS NULL OR "performance_score" BETWEEN 0 AND 100)
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_theme_release_validation_history_candidate_created"
      ON "theme_release_validation_history" ("candidate_id", "created_at" ASC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_release_validation_history_candidate_created"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "theme_release_validation_history"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_release_candidates_status_created"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_release_candidates"`);
  }
}
