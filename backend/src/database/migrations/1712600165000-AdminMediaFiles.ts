import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminMediaFiles1712600165000 implements MigrationInterface {
  name = 'AdminMediaFiles1712600165000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_media_files" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "file_name" varchar(255) NOT NULL,
        "reference" text NOT NULL,
        "mime_type" varchar(128) NOT NULL,
        "size_bytes" bigint NOT NULL,
        "folder_id" varchar(128) NOT NULL,
        "module" varchar(64) NOT NULL,
        "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "description" text NULL,
        "uploaded_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_media_files" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_admin_media_files_reference" UNIQUE ("reference"),
        CONSTRAINT "FK_admin_media_files_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_admin_media_files_created" ON "admin_media_files" ("created_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_media_files"`);
  }
}
