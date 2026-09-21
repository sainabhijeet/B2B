import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantWhatsappHybridTemplates1712600077000 implements MigrationInterface {
  name = 'TenantWhatsappHybridTemplates1712600077000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_whatsapp_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "template_key" varchar(64) NOT NULL,
        "content" text NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_whatsapp_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_whatsapp_templates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_tenant_whatsapp_templates_tenant_key" UNIQUE ("tenant_id", "template_key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_whatsapp_meta_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "template_key" varchar(64) NOT NULL,
        "template_name" varchar(128) NOT NULL,
        "category" varchar(64),
        "status" varchar(32) NOT NULL DEFAULT 'APPROVED',
        "language" varchar(16) NOT NULL DEFAULT 'en',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_whatsapp_meta_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_whatsapp_meta_templates_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_tenant_whatsapp_meta_templates_tenant_key" UNIQUE ("tenant_id", "template_key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_whatsapp_meta_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_whatsapp_templates"`);
  }
}
