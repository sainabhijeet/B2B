import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ApiRequestLogs1712600164000 implements MigrationInterface {
  name = 'ApiRequestLogs1712600164000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_request_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "method" varchar(12) NOT NULL,
        "endpoint" varchar(512) NOT NULL,
        "status_code" integer NOT NULL,
        "latency_ms" integer NOT NULL,
        "tenant_id" uuid NULL,
        "user_id" uuid NULL,
        "error_type" varchar(128) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_request_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_api_request_logs_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_api_request_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_api_request_logs_created" ON "api_request_logs" ("created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_api_request_logs_status_created" ON "api_request_logs" ("status_code", "created_at" DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_api_request_logs_tenant_created" ON "api_request_logs" ("tenant_id", "created_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "api_request_logs"`);
  }
}
