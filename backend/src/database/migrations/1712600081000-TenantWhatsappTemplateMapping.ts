import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantWhatsappTemplateMapping1712600081000 implements MigrationInterface {
  name = 'TenantWhatsappTemplateMapping1712600081000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_whatsapp_template_mapping" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "template_key" character varying(64) NOT NULL,
        "meta_template_name" character varying(128) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_whatsapp_template_mapping" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_whatsapp_template_mapping_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_tenant_whatsapp_template_mapping_tenant_key" UNIQUE ("tenant_id", "template_key")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_whatsapp_template_mapping"`);
  }
}
