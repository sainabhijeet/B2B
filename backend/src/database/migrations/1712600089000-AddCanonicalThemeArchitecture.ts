import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 additive schema. The legacy theme tables remain authoritative; no
 * existing table is altered and no runtime path reads these tables yet.
 */
export class AddCanonicalThemeArchitecture1712600089000 implements MigrationInterface {
  name = 'AddCanonicalThemeArchitecture1712600089000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_families" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" character varying(128) NOT NULL,
        "display_name" character varying(160) NOT NULL,
        "description" text,
        "status" character varying(32) NOT NULL DEFAULT 'ACTIVE',
        "metadata_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_families" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_theme_families_slug" UNIQUE ("slug"),
        CONSTRAINT "CHK_theme_families_status" CHECK ("status" IN ('ACTIVE', 'DEPRECATED', 'ARCHIVED'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_releases" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "theme_family_id" uuid NOT NULL,
        "channel" character varying(16) NOT NULL,
        "version" character varying(32) NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'PUBLISHED',
        "manifest_version" character varying(32) NOT NULL DEFAULT '1',
        "manifest_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "storage_key" character varying(512),
        "archive_key" character varying(512),
        "package_sha256" character(64),
        "package_size_bytes" bigint,
        "legacy_theme_id" uuid,
        "published_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_releases" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_releases_family" FOREIGN KEY ("theme_family_id") REFERENCES "theme_families"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_theme_releases_legacy_theme" FOREIGN KEY ("legacy_theme_id") REFERENCES "themes"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_theme_releases_family_channel_version" UNIQUE ("theme_family_id", "channel", "version"),
        CONSTRAINT "CHK_theme_releases_channel" CHECK ("channel" IN ('WEB', 'MOBILE')),
        CONSTRAINT "CHK_theme_releases_status" CHECK ("status" IN ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED'))
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_theme_releases_legacy_theme_id"
      ON "theme_releases" ("legacy_theme_id") WHERE "legacy_theme_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_bundles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(160) NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'ACTIVE',
        "web_release_id" uuid NOT NULL,
        "mobile_release_id" uuid NOT NULL,
        "preview_image" character varying(512),
        "legacy_combo_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_bundles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_bundles_web_release" FOREIGN KEY ("web_release_id") REFERENCES "theme_releases"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_theme_bundles_mobile_release" FOREIGN KEY ("mobile_release_id") REFERENCES "theme_releases"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_theme_bundles_legacy_combo" FOREIGN KEY ("legacy_combo_id") REFERENCES "theme_combo_mapping"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_theme_bundles_status" CHECK ("status" IN ('ACTIVE', 'DEPRECATED', 'ARCHIVED'))
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_theme_bundles_legacy_combo_id"
      ON "theme_bundles" ("legacy_combo_id") WHERE "legacy_combo_id" IS NOT NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_bundles_release_pair" ON "theme_bundles" ("web_release_id", "mobile_release_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_deployments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "environment" character varying(32) NOT NULL DEFAULT 'PRODUCTION',
        "status" character varying(32) NOT NULL DEFAULT 'ACTIVE',
        "web_release_id" uuid NOT NULL,
        "mobile_release_id" uuid,
        "bundle_id" uuid,
        "legacy_tenant_theme_id" uuid,
        "legacy_tenant_theme_settings_tenant_id" uuid,
        "source" character varying(32) NOT NULL DEFAULT 'BACKFILL',
        "deployed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_deployments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_theme_deployments_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_theme_deployments_web_release" FOREIGN KEY ("web_release_id") REFERENCES "theme_releases"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_theme_deployments_mobile_release" FOREIGN KEY ("mobile_release_id") REFERENCES "theme_releases"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_theme_deployments_bundle" FOREIGN KEY ("bundle_id") REFERENCES "theme_bundles"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_theme_deployments_legacy_tenant_theme" FOREIGN KEY ("legacy_tenant_theme_id") REFERENCES "tenant_themes"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_theme_deployments_legacy_settings_tenant" FOREIGN KEY ("legacy_tenant_theme_settings_tenant_id") REFERENCES "tenant_theme_settings"("tenant_id") ON DELETE SET NULL,
        CONSTRAINT "CHK_theme_deployments_environment" CHECK ("environment" IN ('PRODUCTION', 'PREVIEW')),
        CONSTRAINT "CHK_theme_deployments_status" CHECK ("status" IN ('ACTIVE', 'ROLLED_BACK', 'ARCHIVED'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_deployments_tenant_environment" ON "theme_deployments" ("tenant_id", "environment")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_theme_deployments_active_tenant_environment"
      ON "theme_deployments" ("tenant_id", "environment")
      WHERE "status" = 'ACTIVE'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_theme_deployments_legacy_tenant_theme_id"
      ON "theme_deployments" ("legacy_tenant_theme_id") WHERE "legacy_tenant_theme_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_legacy_mappings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "legacy_entity" character varying(64) NOT NULL,
        "legacy_id" uuid NOT NULL,
        "canonical_entity" character varying(64) NOT NULL,
        "canonical_id" uuid NOT NULL,
        "source_table" character varying(128) NOT NULL,
        "source_version" character varying(32),
        "source_hash" character(64),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_theme_legacy_mappings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_theme_legacy_mappings_source" UNIQUE ("legacy_entity", "legacy_id", "canonical_entity")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_theme_legacy_mappings_canonical" ON "theme_legacy_mappings" ("canonical_entity", "canonical_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "theme_backfill_runs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "run_key" character varying(128) NOT NULL,
        "status" character varying(32) NOT NULL,
        "dry_run" boolean NOT NULL DEFAULT false,
        "source_snapshot_at" TIMESTAMPTZ,
        "counters_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "error_message" text,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "finished_at" TIMESTAMPTZ,
        CONSTRAINT "PK_theme_backfill_runs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_theme_backfill_runs_key" UNIQUE ("run_key"),
        CONSTRAINT "CHK_theme_backfill_runs_status" CHECK ("status" IN ('RUNNING', 'COMPLETED', 'FAILED', 'DRY_RUN'))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_backfill_runs"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_legacy_mappings_canonical"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_legacy_mappings"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_theme_deployments_legacy_tenant_theme_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_theme_deployments_active_tenant_environment"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_deployments_tenant_environment"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_deployments"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_theme_bundles_legacy_combo_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_theme_bundles_release_pair"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_bundles"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_theme_releases_legacy_theme_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_releases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "theme_families"`);
  }
}
