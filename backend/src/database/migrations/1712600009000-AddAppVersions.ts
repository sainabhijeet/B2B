import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppVersions1712600009000 implements MigrationInterface {
  name = 'AddAppVersions1712600009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "app_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "build_job_id" uuid NOT NULL,
        "artifact_id" uuid,
        "version_code" integer NOT NULL,
        "version_name" character varying(64) NOT NULL,
        "release_notes" text,
        "status" character varying(32) NOT NULL DEFAULT 'DRAFT',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_versions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_app_versions_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_app_versions_build_job_id" FOREIGN KEY ("build_job_id") REFERENCES "build_jobs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_app_versions_artifact_id" FOREIGN KEY ("artifact_id") REFERENCES "build_artifacts"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_app_versions_tenant_id" ON "app_versions" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_app_versions_build_job_id" ON "app_versions" ("build_job_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_app_versions_status" ON "app_versions" ("status")`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_app_versions_tenant_version_code" ON "app_versions" ("tenant_id", "version_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_app_versions_tenant_version_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_app_versions_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_app_versions_build_job_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_app_versions_tenant_id"`);
    await queryRunner.query(`DROP TABLE "app_versions"`);
  }
}
