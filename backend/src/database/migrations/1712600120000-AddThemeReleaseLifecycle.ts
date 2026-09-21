import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThemeReleaseLifecycle1712600120000 implements MigrationInterface {
  name = 'AddThemeReleaseLifecycle1712600120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "theme_release_candidates"
        ADD COLUMN IF NOT EXISTS "release_notes" text,
        ADD COLUMN IF NOT EXISTS "changelog_json" jsonb NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS "rollback_metadata_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS "lifecycle_revision" integer NOT NULL DEFAULT 1
    `);
    await queryRunner.query(
      `ALTER TABLE "theme_release_candidates" DROP CONSTRAINT IF EXISTS "CHK_theme_release_candidates_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "theme_release_candidates" ADD CONSTRAINT "CHK_theme_release_candidates_status" CHECK ("status" IN ('DRAFT', 'IN_REVIEW', 'QUARANTINED', 'VALIDATING', 'REJECTED', 'VALIDATED', 'APPROVAL_READY', 'APPROVED', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED'))`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_release_lifecycle_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "candidate_id" uuid NOT NULL,
        "idempotency_key" character varying(160) NOT NULL,
        "action" character varying(64) NOT NULL,
        "from_status" character varying(32),
        "to_status" character varying(32) NOT NULL,
        "actor_user_id" uuid,
        "actor_role" character varying(32),
        "comment" text,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_release_lifecycle_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_release_lifecycle_events_candidate" FOREIGN KEY ("candidate_id") REFERENCES "theme_release_candidates"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_theme_release_lifecycle_events_action" UNIQUE ("candidate_id", "idempotency_key")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_release_lifecycle_events_candidate_created" ON "theme_release_lifecycle_events" ("candidate_id", "created_at" ASC)`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_release_reviewers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "candidate_id" uuid NOT NULL,
        "reviewer_user_id" uuid NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'ASSIGNED',
        "assigned_by_user_id" uuid,
        "completed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_release_reviewers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_release_reviewers_candidate" FOREIGN KEY ("candidate_id") REFERENCES "theme_release_candidates"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_theme_release_reviewers_candidate_user" UNIQUE ("candidate_id", "reviewer_user_id"),
        CONSTRAINT "CHK_theme_release_reviewers_status" CHECK ("status" IN ('ASSIGNED', 'COMPLETED', 'DECLINED'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_release_reviewers_candidate_status" ON "theme_release_reviewers" ("candidate_id", "status")`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_release_review_comments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "candidate_id" uuid NOT NULL,
        "author_user_id" uuid,
        "body" text NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'OPEN',
        "resolved_by_user_id" uuid,
        "resolved_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_release_review_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_release_review_comments_candidate" FOREIGN KEY ("candidate_id") REFERENCES "theme_release_candidates"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_theme_release_review_comments_status" CHECK ("status" IN ('OPEN', 'RESOLVED'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_release_review_comments_candidate_created" ON "theme_release_review_comments" ("candidate_id", "created_at" ASC)`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_release_approval_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "candidate_id" uuid NOT NULL,
        "decision" character varying(32) NOT NULL,
        "actor_user_id" uuid,
        "actor_role" character varying(32),
        "reason" text,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_release_approval_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_release_approval_history_candidate" FOREIGN KEY ("candidate_id") REFERENCES "theme_release_candidates"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_theme_release_approval_history_decision" CHECK ("decision" IN ('APPROVED', 'REJECTED', 'REVOKED'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_release_approval_history_candidate_created" ON "theme_release_approval_history" ("candidate_id", "created_at" ASC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_release_approval_history_candidate_created"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "theme_release_approval_history"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_release_review_comments_candidate_created"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "theme_release_review_comments"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_release_reviewers_candidate_status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_release_reviewers"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_release_lifecycle_events_candidate_created"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "theme_release_lifecycle_events"`,
    );
    await queryRunner.query(
      `ALTER TABLE "theme_release_candidates" DROP CONSTRAINT IF EXISTS "CHK_theme_release_candidates_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "theme_release_candidates" ADD CONSTRAINT "CHK_theme_release_candidates_status" CHECK ("status" IN ('QUARANTINED', 'VALIDATING', 'REJECTED', 'VALIDATED', 'APPROVAL_READY', 'APPROVED', 'ARCHIVED'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "theme_release_candidates" DROP COLUMN IF EXISTS "lifecycle_revision", DROP COLUMN IF EXISTS "rollback_metadata_json", DROP COLUMN IF EXISTS "changelog_json", DROP COLUMN IF EXISTS "release_notes"`,
    );
  }
}
