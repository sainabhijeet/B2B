import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuildLogsAndMetrics1712600012000 implements MigrationInterface {
  name = 'AddBuildLogsAndMetrics1712600012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "build_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "build_job_id" uuid NOT NULL,
        "log_level" varchar(16) NOT NULL DEFAULT 'INFO',
        "log_output" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_build_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_build_logs_build_job_id" FOREIGN KEY ("build_job_id") REFERENCES "build_jobs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_build_logs_build_job_id"
      ON "build_logs" ("build_job_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "build_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "build_job_id" uuid NOT NULL,
        "queue_wait_time_ms" int NOT NULL DEFAULT 0,
        "build_duration_ms" int NOT NULL DEFAULT 0,
        "artifact_size_bytes" bigint NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_build_metrics_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_build_metrics_build_job_id" UNIQUE ("build_job_id"),
        CONSTRAINT "FK_build_metrics_build_job_id" FOREIGN KEY ("build_job_id") REFERENCES "build_jobs"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "build_metrics"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_build_logs_build_job_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "build_logs"`);
  }
}
