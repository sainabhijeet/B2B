import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsappMetaTemplateTenantNameUnique1712600079000 implements MigrationInterface {
  name = 'WhatsappMetaTemplateTenantNameUnique1712600079000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_tenant_whatsapp_meta_templates_tenant_key_nn"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_tenant_whatsapp_meta_templates_tenant_name_lang"
    `);

    await queryRunner.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY tenant_id, template_name
                 ORDER BY CASE WHEN UPPER(COALESCE(status, '')) = 'APPROVED' THEN 0 ELSE 1 END,
                          last_synced_at DESC NULLS LAST,
                          updated_at DESC
               ) AS rn
        FROM tenant_whatsapp_meta_templates
      )
      DELETE FROM tenant_whatsapp_meta_templates t
      USING ranked r
      WHERE t.id = r.id AND r.rn > 1
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_meta_templates" DROP COLUMN IF EXISTS "template_key"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tenant_whatsapp_meta_templates_tenant_name"
      ON "tenant_whatsapp_meta_templates" ("tenant_id", "template_name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_tenant_whatsapp_meta_templates_tenant_name"
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_meta_templates"
      ADD COLUMN IF NOT EXISTS "template_key" character varying(64) NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tenant_whatsapp_meta_templates_tenant_name_lang"
      ON "tenant_whatsapp_meta_templates" ("tenant_id", "template_name", "language")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tenant_whatsapp_meta_templates_tenant_key_nn"
      ON "tenant_whatsapp_meta_templates" ("tenant_id", "template_key")
      WHERE "template_key" IS NOT NULL
    `);
  }
}
