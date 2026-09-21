import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Phase 2 additive immutable artifact metadata; runtime remains filesystem-only. */
export class AddThemeReleaseArtifacts1712600100000 implements MigrationInterface {
  name = 'AddThemeReleaseArtifacts1712600100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_release_artifacts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "theme_release_id" uuid,
        "legacy_theme_id" uuid NOT NULL,
        "artifact_type" character varying(32) NOT NULL DEFAULT 'ZIP',
        "storage_provider" character varying(32) NOT NULL,
        "bucket_name" character varying(255) NOT NULL,
        "object_key" character varying(512) NOT NULL,
        "sha256" character(64) NOT NULL,
        "size_bytes" bigint NOT NULL,
        "content_type" character varying(128) NOT NULL,
        "etag" character varying(256),
        "verified_at" TIMESTAMPTZ NOT NULL,
        "metadata_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_release_artifacts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_release_artifacts_release" FOREIGN KEY ("theme_release_id") REFERENCES "theme_releases"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_theme_release_artifacts_legacy_theme" FOREIGN KEY ("legacy_theme_id") REFERENCES "themes"("id") ON DELETE RESTRICT,
        CONSTRAINT "UQ_theme_release_artifacts_object_key" UNIQUE ("object_key"),
        CONSTRAINT "CHK_theme_release_artifacts_type" CHECK ("artifact_type" IN ('ZIP')),
        CONSTRAINT "CHK_theme_release_artifacts_provider" CHECK ("storage_provider" IN ('S3_COMPATIBLE')),
        CONSTRAINT "CHK_theme_release_artifacts_sha256" CHECK ("sha256" ~ '^[0-9a-fA-F]{64}$'),
        CONSTRAINT "CHK_theme_release_artifacts_size" CHECK ("size_bytes" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_theme_release_artifacts_legacy_type"
      ON "theme_release_artifacts" ("legacy_theme_id", "artifact_type")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_theme_release_artifacts_release_type"
      ON "theme_release_artifacts" ("theme_release_id", "artifact_type")
      WHERE "theme_release_id" IS NOT NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_release_artifacts_sha256" ON "theme_release_artifacts" ("sha256")`,
    );
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "prevent_theme_release_artifact_mutation"()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$ BEGIN
        RAISE EXCEPTION 'Theme release artifacts are immutable';
      END; $$
    `);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_theme_release_artifacts_immutable" ON "theme_release_artifacts"`,
    );
    await queryRunner.query(`
      CREATE TRIGGER "TRG_theme_release_artifacts_immutable"
      BEFORE UPDATE OR DELETE ON "theme_release_artifacts"
      FOR EACH ROW EXECUTE FUNCTION "prevent_theme_release_artifact_mutation"()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "TRG_theme_release_artifacts_immutable" ON "theme_release_artifacts"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_release_artifacts_sha256"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_theme_release_artifacts_release_type"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_theme_release_artifacts_legacy_type"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_release_artifacts"`);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS "prevent_theme_release_artifact_mutation"()`,
    );
  }
}
