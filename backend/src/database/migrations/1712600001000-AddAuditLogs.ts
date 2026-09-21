import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogs1712600001000 implements MigrationInterface {
  name = 'AddAuditLogs1712600001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NULL,
        "actor_user_id" uuid NULL,
        "action" varchar(128) NOT NULL,
        "metadata" jsonb NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_created_at"
      ON "audit_logs" ("tenant_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor_created_at"
      ON "audit_logs" ("actor_user_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_actor_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_tenant_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}
