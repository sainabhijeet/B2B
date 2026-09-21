import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MobileReleaseManagement1712600090000 implements MigrationInterface {
  name = 'MobileReleaseManagement1712600090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mobile_release_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "google_package_name" varchar(255),
        "google_service_account_json_encrypted" text,
        "google_default_track" varchar(32) NOT NULL DEFAULT 'internal',
        "google_release_notes_template" text,
        "apple_bundle_identifier" varchar(255),
        "apple_issuer_id" varchar(128),
        "apple_key_id" varchar(128),
        "apple_api_key_encrypted" text,
        "apple_team_id" varchar(128),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mobile_release_settings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mobile_release_settings_tenant" ON "mobile_release_settings" ("tenant_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mobile_releases" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "build_job_id" uuid,
        "artifact_id" uuid NOT NULL,
        "platform" varchar(24) NOT NULL,
        "version_name" varchar(64) NOT NULL,
        "build_number" integer NOT NULL,
        "package_name" varchar(255) NOT NULL,
        "release_track" varchar(32),
        "google_release_id" varchar(255),
        "apple_build_id" varchar(255),
        "build_date" TIMESTAMP WITH TIME ZONE,
        "upload_date" TIMESTAMP WITH TIME ZONE,
        "uploaded_by_user_id" uuid,
        "status" varchar(32) NOT NULL,
        "download_url" text,
        "release_notes" text,
        "progress" integer NOT NULL DEFAULT 0,
        "processing_status" varchar(64),
        "error_message" text,
        "duration_ms" integer,
        "source_release_id" uuid,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mobile_releases" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mobile_releases_tenant_created" ON "mobile_releases" ("tenant_id", "created_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mobile_releases_tenant_platform_status" ON "mobile_releases" ("tenant_id", "platform", "status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mobile_release_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "release_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "event" varchar(64) NOT NULL,
        "progress" integer NOT NULL DEFAULT 0,
        "message" text,
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mobile_release_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mobile_release_events_release_created" ON "mobile_release_events" ("release_id", "created_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_mobile_release_events_release_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mobile_release_events"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_mobile_releases_tenant_platform_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_mobile_releases_tenant_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mobile_releases"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_mobile_release_settings_tenant"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mobile_release_settings"`);
  }
}
