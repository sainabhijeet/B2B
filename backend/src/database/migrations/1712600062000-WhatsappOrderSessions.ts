import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsappOrderSessions1712600062000 implements MigrationInterface {
  name = 'WhatsappOrderSessions1712600062000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_order_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "state" varchar(32) NOT NULL DEFAULT 'IDLE',
        "context_json" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_order_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_whatsapp_order_sessions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_whatsapp_order_sessions_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_whatsapp_order_sessions_tenant_customer" UNIQUE ("tenant_id", "customer_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_whatsapp_order_sessions_updated"
      ON "whatsapp_order_sessions" ("tenant_id", "updated_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_order_sessions"`);
  }
}
