import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AppBuildVersionHistory1712600089000 implements MigrationInterface {
  name = 'AppBuildVersionHistory1712600089000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "app_versions" ADD COLUMN IF NOT EXISTS "platform" varchar(16) NOT NULL DEFAULT 'ANDROID'`);
    await queryRunner.query(`ALTER TABLE "app_versions" ADD COLUMN IF NOT EXISTS "build_number" integer`);
    await queryRunner.query(`UPDATE "app_versions" SET "build_number" = "version_code" WHERE "build_number" IS NULL`);
    await queryRunner.query(`ALTER TABLE "app_versions" ALTER COLUMN "build_number" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "app_versions" ADD COLUMN IF NOT EXISTS "build_status" varchar(32) NOT NULL DEFAULT 'SUCCESS'`);
    await queryRunner.query(`ALTER TABLE "app_versions" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "app_versions" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`UPDATE "app_versions" SET "completed_at" = "created_at" WHERE "completed_at" IS NULL`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_app_versions_tenant_version_code"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_app_versions_tenant_platform_build" ON "app_versions" ("tenant_id", "platform", "build_number")`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_app_versions_platform" ON "app_versions" ("platform")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_app_versions_build_status" ON "app_versions" ("build_status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_app_versions_build_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_app_versions_platform"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_app_versions_tenant_platform_build"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_app_versions_tenant_version_code" ON "app_versions" ("tenant_id", "version_code")`,
    );
    await queryRunner.query(`ALTER TABLE "app_versions" DROP COLUMN IF EXISTS "completed_at"`);
    await queryRunner.query(`ALTER TABLE "app_versions" DROP COLUMN IF EXISTS "started_at"`);
    await queryRunner.query(`ALTER TABLE "app_versions" DROP COLUMN IF EXISTS "build_status"`);
    await queryRunner.query(`ALTER TABLE "app_versions" DROP COLUMN IF EXISTS "build_number"`);
    await queryRunner.query(`ALTER TABLE "app_versions" DROP COLUMN IF EXISTS "platform"`);
  }
}
