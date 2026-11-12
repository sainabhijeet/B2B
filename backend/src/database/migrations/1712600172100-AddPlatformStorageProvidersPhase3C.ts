import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlatformStorageProvidersPhase3C1712600172100 implements MigrationInterface {
  name = 'AddPlatformStorageProvidersPhase3C1712600172100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_storage_providers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "type" varchar(32) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'active',
        "is_default" boolean NOT NULL DEFAULT false,
        "mode" varchar(8) NOT NULL DEFAULT 'LIVE',
        "configuration" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "credentials" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "health_status" varchar(16) NOT NULL DEFAULT 'UNKNOWN',
        "last_checked_at" timestamptz NULL,
        "last_successful_check_at" timestamptz NULL,
        "last_failed_check_at" timestamptz NULL,
        "last_latency_ms" integer NULL,
        "health_message" varchar(255) NULL,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_storage_providers_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_platform_storage_providers_name" UNIQUE ("name"),
        CONSTRAINT "CHK_platform_storage_providers_type" CHECK ("type" IN ('LOCAL', 'S3_COMPATIBLE')),
        CONSTRAINT "CHK_platform_storage_providers_status" CHECK ("status" IN ('active', 'inactive')),
        CONSTRAINT "CHK_platform_storage_providers_mode" CHECK ("mode" IN ('TEST', 'LIVE')),
        CONSTRAINT "CHK_platform_storage_providers_health" CHECK ("health_status" IN ('UNKNOWN', 'HEALTHY', 'UNHEALTHY')),
        CONSTRAINT "CHK_platform_storage_providers_default_active" CHECK ("is_default" = false OR "status" = 'active'),
        CONSTRAINT "CHK_platform_storage_providers_latency" CHECK ("last_latency_ms" IS NULL OR "last_latency_ms" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_platform_storage_providers_single_default"
      ON "platform_storage_providers" ("is_default")
      WHERE "is_default" = true
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_platform_storage_providers_type_status"
      ON "platform_storage_providers" ("type", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_platform_storage_providers_default"
      ON "platform_storage_providers" ("is_default")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_platform_storage_providers_health"
      ON "platform_storage_providers" ("health_status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_platform_storage_providers_mode"
      ON "platform_storage_providers" ("mode")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_platform_storage_providers_mode"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_platform_storage_providers_health"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_platform_storage_providers_default"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_platform_storage_providers_type_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_platform_storage_providers_single_default"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "platform_storage_providers"`,
    );
  }
}
