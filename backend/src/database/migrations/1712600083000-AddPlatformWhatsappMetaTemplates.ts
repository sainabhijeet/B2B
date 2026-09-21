import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlatformWhatsappMetaTemplates1712600083000 implements MigrationInterface {
  name = 'AddPlatformWhatsappMetaTemplates1712600083000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_whatsapp_meta_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "waba_id" character varying(128) NOT NULL,
        "template_name" character varying(128) NOT NULL,
        "category" character varying(64),
        "status" character varying(32) NOT NULL DEFAULT 'PENDING',
        "language" character varying(16) NOT NULL DEFAULT 'en',
        "components_json" jsonb,
        "source_tenant_id" uuid,
        "last_synced_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_whatsapp_meta_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_platform_whatsapp_meta_templates_source_tenant" FOREIGN KEY ("source_tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_platform_whatsapp_meta_templates_waba_name_lang" UNIQUE ("waba_id", "template_name", "language")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_platform_whatsapp_meta_templates_waba_id"
      ON "platform_whatsapp_meta_templates" ("waba_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_whatsapp_meta_templates"`);
  }
}
