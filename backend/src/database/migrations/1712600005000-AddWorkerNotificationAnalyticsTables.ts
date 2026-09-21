import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkerNotificationAnalyticsTables1712600005000
  implements MigrationInterface
{
  name = 'AddWorkerNotificationAnalyticsTables1712600005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "type" varchar(64) NOT NULL,
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "status" varchar(32) NOT NULL DEFAULT 'SENT',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "analytics_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NULL,
        "event_type" varchar(64) NOT NULL,
        "entity_type" varchar(64) NULL,
        "entity_id" uuid NULL,
        "metadata_json" jsonb NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_events_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_analytics_events_tenant_event_created"
      ON "analytics_events" ("tenant_id", "event_type", "created_at")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "worker_name" varchar(64) NOT NULL,
        "event_type" varchar(64) NOT NULL,
        "status" varchar(32) NOT NULL,
        "error_message" text NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_logs_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "logs"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_analytics_events_tenant_event_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
  }
}
