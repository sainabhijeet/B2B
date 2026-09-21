import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuildSystemSkeleton1712600008000 implements MigrationInterface {
  name = 'AddBuildSystemSkeleton1712600008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "build_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "build_type" character varying(32) NOT NULL,
        "package_name" character varying(255) NOT NULL,
        "app_name" character varying(255) NOT NULL,
        "theme_id" character varying(128),
        "languages" jsonb NOT NULL DEFAULT '[]',
        "firebase_app_id" character varying(255),
        "status" character varying(32) NOT NULL DEFAULT 'PENDING',
        "priority" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "started_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "error_message" text,
        CONSTRAINT "PK_build_jobs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_build_jobs_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_build_jobs_tenant_id" ON "build_jobs" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_build_jobs_status" ON "build_jobs" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_build_jobs_build_type" ON "build_jobs" ("build_type")`);

    await queryRunner.query(`
      CREATE TABLE "build_artifacts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "build_job_id" uuid NOT NULL,
        "artifact_type" character varying(32) NOT NULL,
        "file_path" text NOT NULL,
        "file_size" bigint NOT NULL DEFAULT 0,
        "version_code" integer,
        "version_name" character varying(64),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_build_artifacts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_build_artifacts_job_id" FOREIGN KEY ("build_job_id") REFERENCES "build_jobs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_build_artifacts_build_job_id" ON "build_artifacts" ("build_job_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_build_artifacts_build_job_id"`);
    await queryRunner.query(`DROP TABLE "build_artifacts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_build_jobs_build_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_build_jobs_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_build_jobs_tenant_id"`);
    await queryRunner.query(`DROP TABLE "build_jobs"`);
  }
}
