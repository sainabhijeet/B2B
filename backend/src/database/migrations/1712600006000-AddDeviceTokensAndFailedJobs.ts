import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeviceTokensAndFailedJobs1712600006000
  implements MigrationInterface
{
  name = 'AddDeviceTokensAndFailedJobs1712600006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_device_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token" text NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_device_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_device_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_device_tokens_user_token_unique"
      ON "user_device_tokens" ("user_id", "token")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "failed_jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "worker_name" varchar(64) NOT NULL,
        "queue_name" varchar(64) NOT NULL,
        "event_type" varchar(64) NOT NULL,
        "payload_json" jsonb NULL,
        "error_message" text NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_failed_jobs_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "failed_jobs"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_device_tokens_user_token_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_device_tokens"`);
  }
}
