import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsappMessageRawPayloadSessionLastActive1712600063000 implements MigrationInterface {
  name = 'WhatsappMessageRawPayloadSessionLastActive1712600063000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "whatsapp_messages"
      ADD COLUMN IF NOT EXISTS "raw_payload" jsonb NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions"
      ADD COLUMN IF NOT EXISTS "last_active_at" timestamptz NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      UPDATE "whatsapp_order_sessions"
      SET "last_active_at" = COALESCE("updated_at", "created_at")
      WHERE "last_active_at" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions" DROP COLUMN IF EXISTS "updated_at"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_whatsapp_order_sessions_updated"`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_whatsapp_order_sessions_last_active"
      ON "whatsapp_order_sessions" ("tenant_id", "last_active_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_whatsapp_order_sessions_last_active"`);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions"
      ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      UPDATE "whatsapp_order_sessions" SET "updated_at" = "last_active_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_order_sessions" DROP COLUMN IF EXISTS "last_active_at"
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_whatsapp_order_sessions_updated"
      ON "whatsapp_order_sessions" ("tenant_id", "updated_at" DESC)
    `);
    await queryRunner.query(`
      ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "raw_payload"
    `);
  }
}
