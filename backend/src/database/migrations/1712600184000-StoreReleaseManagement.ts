import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StoreReleaseManagement1712600184000 implements MigrationInterface {
  name = 'StoreReleaseManagement1712600184000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_release_settings (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        platform varchar(16) NOT NULL,
        package_name_or_bundle_id varchar(255) NOT NULL,
        release_track varchar(64),
        credential_status varchar(32) NOT NULL DEFAULT 'NOT_CONFIGURED',
        encrypted_credentials text,
        created_by uuid,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_release_settings" PRIMARY KEY (id),
        CONSTRAINT "FK_store_release_settings_tenant" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT "FK_store_release_settings_created_by" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT "FK_store_release_settings_updated_by" FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT "CHK_store_release_settings_platform" CHECK (platform IN ('ANDROID', 'IOS')),
        CONSTRAINT "CHK_store_release_settings_credential_status" CHECK (credential_status IN ('NOT_CONFIGURED', 'CONFIGURED')),
        CONSTRAINT "UQ_store_release_settings_tenant_platform_package" UNIQUE (tenant_id, platform, package_name_or_bundle_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_releases (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        build_artifact_id uuid NOT NULL,
        app_version_id uuid,
        platform varchar(16) NOT NULL,
        store_provider varchar(32) NOT NULL,
        track varchar(64),
        version_name varchar(64),
        version_code integer,
        status varchar(32) NOT NULL DEFAULT 'DRAFT',
        external_release_id varchar(255),
        last_error_code varchar(128),
        last_error_message text,
        submitted_by uuid,
        submitted_at timestamptz,
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_releases" PRIMARY KEY (id),
        CONSTRAINT "FK_store_releases_tenant" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT "FK_store_releases_artifact" FOREIGN KEY (build_artifact_id) REFERENCES build_artifacts(id) ON DELETE RESTRICT,
        CONSTRAINT "FK_store_releases_app_version" FOREIGN KEY (app_version_id) REFERENCES app_versions(id) ON DELETE SET NULL,
        CONSTRAINT "FK_store_releases_submitted_by" FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT "CHK_store_releases_platform" CHECK (platform IN ('ANDROID', 'IOS')),
        CONSTRAINT "CHK_store_releases_provider" CHECK (store_provider IN ('GOOGLE_PLAY', 'APPLE_APP_STORE')),
        CONSTRAINT "CHK_store_releases_status" CHECK (status IN ('DRAFT', 'QUEUED', 'SUBMITTING', 'SUBMITTED', 'IN_REVIEW', 'LIVE', 'FAILED', 'CANCELLED', 'ROLLED_BACK'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS store_release_events (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        release_id uuid NOT NULL,
        tenant_id uuid NOT NULL,
        event_type varchar(64) NOT NULL,
        from_status varchar(32),
        to_status varchar(32),
        actor_user_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_store_release_events" PRIMARY KEY (id),
        CONSTRAINT "FK_store_release_events_release" FOREIGN KEY (release_id) REFERENCES store_releases(id) ON DELETE CASCADE,
        CONSTRAINT "FK_store_release_events_tenant" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        CONSTRAINT "FK_store_release_events_actor" FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_store_releases_tenant_status" ON store_releases (tenant_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_store_releases_tenant_platform_created" ON store_releases (tenant_id, platform, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_store_release_events_release_created" ON store_release_events (release_id, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_store_release_events_tenant_created" ON store_release_events (tenant_id, created_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS store_release_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_releases`);
    await queryRunner.query(`DROP TABLE IF EXISTS store_release_settings`);
  }
}
