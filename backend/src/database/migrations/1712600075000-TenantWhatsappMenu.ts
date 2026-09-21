import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantWhatsappMenu1712600075000 implements MigrationInterface {
  name = 'TenantWhatsappMenu1712600075000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_whatsapp_menu" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "menu_key" varchar(24) NOT NULL,
        "label" varchar(64) NOT NULL,
        "position" int NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_whatsapp_menu" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_whatsapp_menu_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_tenant_whatsapp_menu_tenant_key" UNIQUE ("tenant_id", "menu_key")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tenant_whatsapp_menu_tenant_position"
      ON "tenant_whatsapp_menu" ("tenant_id", "position")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_whatsapp_menu"`);
  }
}
