import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStorageObjectsRegistryPhase3C1712600172200 implements MigrationInterface {
  name = 'AddStorageObjectsRegistryPhase3C1712600172200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "storage_objects" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NULL,
        "provider_id" uuid NULL,
        "object_key" varchar(1024) NOT NULL,
        "original_filename" varchar(255) NULL,
        "mime_type" varchar(255) NULL,
        "size_bytes" bigint NULL,
        "checksum_sha256" char(64) NULL,
        "ownership_type" varchar(16) NOT NULL,
        "object_category" varchar(64) NOT NULL,
        "access_scope" varchar(32) NOT NULL DEFAULT 'TENANT_PRIVATE',
        "status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
        "deleted_at" timestamptz NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_storage_objects_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_storage_objects_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_storage_objects_provider" FOREIGN KEY ("provider_id") REFERENCES "platform_storage_providers" ("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_storage_objects_owner_scope" CHECK (("ownership_type" = 'PLATFORM' AND "tenant_id" IS NULL) OR ("ownership_type" = 'TENANT' AND "tenant_id" IS NOT NULL)),
        CONSTRAINT "CHK_storage_objects_ownership_type" CHECK ("ownership_type" IN ('PLATFORM', 'TENANT')),
        CONSTRAINT "CHK_storage_objects_status" CHECK ("status" IN ('ACTIVE', 'DELETED')),
        CONSTRAINT "CHK_storage_objects_access_scope" CHECK ("access_scope" IN ('PLATFORM_PRIVATE', 'TENANT_PRIVATE', 'PUBLIC_METADATA')),
        CONSTRAINT "CHK_storage_objects_scope_matches_owner" CHECK (("ownership_type" = 'PLATFORM' AND "access_scope" = 'PLATFORM_PRIVATE') OR ("ownership_type" = 'TENANT' AND "access_scope" IN ('TENANT_PRIVATE', 'PUBLIC_METADATA'))),
        CONSTRAINT "CHK_storage_objects_size_non_negative" CHECK ("size_bytes" IS NULL OR "size_bytes" >= 0),
        CONSTRAINT "CHK_storage_objects_checksum_sha256" CHECK ("checksum_sha256" IS NULL OR "checksum_sha256" ~ '^[a-f0-9]{64}$'),
        CONSTRAINT "CHK_storage_objects_key_safe" CHECK ("object_key" <> '' AND "object_key" !~ '(^|/)\\.\\.?(/|$)' AND "object_key" NOT LIKE '/%' AND "object_key" NOT LIKE '%\\%' AND "object_key" NOT LIKE '%:%')
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_storage_objects_tenant_active_key"
      ON "storage_objects" ("tenant_id", COALESCE("provider_id", '00000000-0000-0000-0000-000000000000'::uuid), "object_key")
      WHERE "ownership_type" = 'TENANT' AND "status" <> 'DELETED'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_storage_objects_platform_active_key"
      ON "storage_objects" (COALESCE("provider_id", '00000000-0000-0000-0000-000000000000'::uuid), "object_key")
      WHERE "ownership_type" = 'PLATFORM' AND "status" <> 'DELETED'
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_storage_objects_tenant_status"
      ON "storage_objects" ("tenant_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_storage_objects_provider_status"
      ON "storage_objects" ("provider_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_storage_objects_object_key"
      ON "storage_objects" ("object_key")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_storage_objects_owner_category_status"
      ON "storage_objects" ("ownership_type", "object_category", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_storage_objects_created_at"
      ON "storage_objects" ("created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_storage_objects_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_storage_objects_owner_category_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_storage_objects_object_key"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_storage_objects_provider_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_storage_objects_tenant_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_storage_objects_platform_active_key"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_storage_objects_tenant_active_key"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "storage_objects"`);
  }
}
