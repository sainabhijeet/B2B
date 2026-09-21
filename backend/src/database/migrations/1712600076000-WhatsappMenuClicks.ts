import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsappMenuClicks1712600076000 implements MigrationInterface {
  name = 'WhatsappMenuClicks1712600076000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_menu_clicks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "customer_id" uuid,
        "menu_key" varchar(32) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_menu_clicks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_whatsapp_menu_clicks_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_whatsapp_menu_clicks_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_whatsapp_menu_clicks_tenant_created"
      ON "whatsapp_menu_clicks" ("tenant_id", "created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_menu_clicks"`);
  }
}
