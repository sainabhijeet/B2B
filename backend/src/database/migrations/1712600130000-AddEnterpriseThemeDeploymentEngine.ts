import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnterpriseThemeDeploymentEngine1712600130000 implements MigrationInterface {
  name = 'AddEnterpriseThemeDeploymentEngine1712600130000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "theme_enterprise_deployments" (
        "id" uuid PRIMARY KEY,
        "idempotency_key" varchar(160) NOT NULL UNIQUE,
        "tenant_id" uuid NOT NULL,
        "channel" varchar(16) NOT NULL,
        "environment" varchar(32) NOT NULL,
        "release_candidate_id" uuid NOT NULL,
        "snapshot_id" uuid NOT NULL UNIQUE,
        "initial_state" varchar(16) NOT NULL DEFAULT 'QUEUED',
        "version_graph_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "dependency_report_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "canary_metadata_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "rollout_metadata_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "rollback_metadata_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_by_user_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_theme_enterprise_deployments_candidate" FOREIGN KEY ("release_candidate_id") REFERENCES "theme_release_candidates"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_theme_enterprise_deployments_channel" CHECK ("channel" IN ('WEB', 'MOBILE', 'COMBINED')),
        CONSTRAINT "CHK_theme_enterprise_deployments_environment" CHECK ("environment" IN ('PREVIEW', 'STAGING', 'PRODUCTION')),
        CONSTRAINT "CHK_theme_enterprise_deployments_initial_state" CHECK ("initial_state" = 'QUEUED')
      )
    `);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_enterprise_deployments_scope_created" ON "theme_enterprise_deployments" ("tenant_id", "channel", "environment", "created_at" DESC)`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_enterprise_deployments_candidate_created" ON "theme_enterprise_deployments" ("release_candidate_id", "created_at" DESC)`,
    );

    await q.query(`
      CREATE TABLE IF NOT EXISTS "theme_deployment_snapshots" (
        "id" uuid PRIMARY KEY,
        "deployment_id" uuid NOT NULL UNIQUE,
        "release_candidate_id" uuid NOT NULL,
        "release_version" varchar(32) NOT NULL,
        "package_sha256" char(64) NOT NULL,
        "manifest_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "snapshot_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "snapshot_hash" char(64) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_theme_deployment_snapshots_deployment" FOREIGN KEY ("deployment_id") REFERENCES "theme_enterprise_deployments"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_theme_deployment_snapshots_candidate" FOREIGN KEY ("release_candidate_id") REFERENCES "theme_release_candidates"("id") ON DELETE RESTRICT
      )
    `);
    await q.query(`
      CREATE TABLE IF NOT EXISTS "theme_deployment_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "deployment_id" uuid NOT NULL,
        "sequence" integer NOT NULL,
        "idempotency_key" varchar(160) NOT NULL,
        "from_state" varchar(16),
        "to_state" varchar(16) NOT NULL,
        "actor_user_id" uuid,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_theme_deployment_events_deployment" FOREIGN KEY ("deployment_id") REFERENCES "theme_enterprise_deployments"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_theme_deployment_events_sequence" UNIQUE ("deployment_id", "sequence"),
        CONSTRAINT "UQ_theme_deployment_events_idempotency" UNIQUE ("deployment_id", "idempotency_key"),
        CONSTRAINT "CHK_theme_deployment_events_state" CHECK ("to_state" IN ('QUEUED', 'PREPARING', 'DEPLOYING', 'VERIFYING', 'HEALTHY', 'FAILED', 'ROLLEDBACK', 'CANCELLED'))
      )
    `);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_deployment_events_deployment_created" ON "theme_deployment_events" ("deployment_id", "created_at" ASC)`,
    );
    await q.query(`
      CREATE TABLE IF NOT EXISTS "theme_deployment_queue_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "deployment_id" uuid NOT NULL UNIQUE,
        "priority" integer NOT NULL DEFAULT 100,
        "status" varchar(32) NOT NULL DEFAULT 'QUEUED',
        "queue_key" varchar(160) NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_theme_deployment_queue_entries_deployment" FOREIGN KEY ("deployment_id") REFERENCES "theme_enterprise_deployments"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_theme_deployment_queue_entries_status" CHECK ("status" = 'QUEUED')
      )
    `);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_deployment_queue_priority_created" ON "theme_deployment_queue_entries" ("priority", "created_at")`,
    );
    await q.query(`
      CREATE TABLE IF NOT EXISTS "theme_deployment_locks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "channel" varchar(16) NOT NULL,
        "environment" varchar(32) NOT NULL,
        "deployment_id" uuid NOT NULL,
        "lease_token" varchar(128) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_theme_deployment_locks_deployment" FOREIGN KEY ("deployment_id") REFERENCES "theme_enterprise_deployments"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_theme_deployment_locks_scope" UNIQUE ("tenant_id", "channel", "environment")
      )
    `);
    await q.query(`
      CREATE TABLE IF NOT EXISTS "theme_deployment_health_checks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "deployment_id" uuid NOT NULL,
        "status" varchar(32) NOT NULL,
        "latency_ms" integer,
        "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_theme_deployment_health_checks_deployment" FOREIGN KEY ("deployment_id") REFERENCES "theme_enterprise_deployments"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_theme_deployment_health_checks_status" CHECK ("status" IN ('PASSED', 'FAILED', 'PENDING'))
      )
    `);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_deployment_health_checks_deployment_created" ON "theme_deployment_health_checks" ("deployment_id", "created_at" ASC)`,
    );
    await q.query(`
      CREATE TABLE IF NOT EXISTS "theme_deployment_progress_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "deployment_id" uuid NOT NULL,
        "percent" smallint NOT NULL,
        "message" varchar(128),
        "idempotency_key" varchar(160) NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_theme_deployment_progress_events_deployment" FOREIGN KEY ("deployment_id") REFERENCES "theme_enterprise_deployments"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_theme_deployment_progress_events_percent" CHECK ("percent" BETWEEN 0 AND 100)
      )
    `);
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_deployment_progress_deployment_created" ON "theme_deployment_progress_events" ("deployment_id", "created_at" ASC)`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DROP INDEX IF EXISTS "IDX_theme_deployment_progress_deployment_created"`,
    );
    await q.query(`DROP TABLE IF EXISTS "theme_deployment_progress_events"`);
    await q.query(
      `DROP INDEX IF EXISTS "IDX_theme_deployment_health_checks_deployment_created"`,
    );
    await q.query(`DROP TABLE IF EXISTS "theme_deployment_health_checks"`);
    await q.query(`DROP TABLE IF EXISTS "theme_deployment_locks"`);
    await q.query(
      `DROP INDEX IF EXISTS "IDX_theme_deployment_queue_priority_created"`,
    );
    await q.query(`DROP TABLE IF EXISTS "theme_deployment_queue_entries"`);
    await q.query(
      `DROP INDEX IF EXISTS "IDX_theme_deployment_events_deployment_created"`,
    );
    await q.query(`DROP TABLE IF EXISTS "theme_deployment_events"`);
    await q.query(`DROP TABLE IF EXISTS "theme_deployment_snapshots"`);
    await q.query(
      `DROP INDEX IF EXISTS "IDX_theme_enterprise_deployments_candidate_created"`,
    );
    await q.query(
      `DROP INDEX IF EXISTS "IDX_theme_enterprise_deployments_scope_created"`,
    );
    await q.query(`DROP TABLE IF EXISTS "theme_enterprise_deployments"`);
  }
}
