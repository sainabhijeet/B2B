import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaFoldersPhase3C1712600172300 implements MigrationInterface {
  name = 'AddMediaFoldersPhase3C1712600172300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "media_folders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "parent_id" uuid NULL,
        "ownership_type" varchar(16) NOT NULL,
        "tenant_id" uuid NULL,
        "created_by" uuid NULL,
        "updated_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_media_folders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_media_folders_parent" FOREIGN KEY ("parent_id") REFERENCES "media_folders" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_media_folders_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_media_folders_owner_scope" CHECK (("ownership_type" = 'PLATFORM' AND "tenant_id" IS NULL) OR ("ownership_type" = 'TENANT' AND "tenant_id" IS NOT NULL)),
        CONSTRAINT "CHK_media_folders_ownership_type" CHECK ("ownership_type" IN ('PLATFORM', 'TENANT')),
        CONSTRAINT "CHK_media_folders_name_safe" CHECK ("name" <> '' AND "name" !~ '[\\x00-\\x1F\\x7F]' AND "name" NOT IN ('.', '..') AND "name" NOT LIKE '%/%' AND "name" NOT LIKE '%\\%'),
        CONSTRAINT "CHK_media_folders_not_self_parent" CHECK ("parent_id" IS NULL OR "parent_id" <> "id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_media_folders_parent"
      ON "media_folders" ("parent_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_media_folders_owner_parent"
      ON "media_folders" ("ownership_type", "tenant_id", "parent_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_media_folders_platform_sibling_name"
      ON "media_folders" (LOWER("name"), COALESCE("parent_id", '00000000-0000-0000-0000-000000000000'::uuid))
      WHERE "ownership_type" = 'PLATFORM' AND "tenant_id" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_media_folders_tenant_sibling_name"
      ON "media_folders" ("tenant_id", LOWER("name"), COALESCE("parent_id", '00000000-0000-0000-0000-000000000000'::uuid))
      WHERE "ownership_type" = 'TENANT' AND "tenant_id" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "storage_objects"
      ADD COLUMN IF NOT EXISTS "folder_id" uuid NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_storage_objects_media_folder'
        ) THEN
          ALTER TABLE "storage_objects"
          ADD CONSTRAINT "FK_storage_objects_media_folder"
          FOREIGN KEY ("folder_id") REFERENCES "media_folders" ("id") ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_storage_objects_folder_status"
      ON "storage_objects" ("folder_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_storage_objects_folder_status"`,
    );
    await queryRunner.query(`
      ALTER TABLE "storage_objects"
      DROP CONSTRAINT IF EXISTS "FK_storage_objects_media_folder"
    `);
    await queryRunner.query(`
      ALTER TABLE "storage_objects"
      DROP COLUMN IF EXISTS "folder_id"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_media_folders_tenant_sibling_name"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_media_folders_platform_sibling_name"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_media_folders_owner_parent"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_media_folders_parent"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "media_folders"`);
  }
}
