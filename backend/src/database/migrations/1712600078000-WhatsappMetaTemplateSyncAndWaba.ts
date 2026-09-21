import { MigrationInterface, QueryRunner } from 'typeorm';

export class WhatsappMetaTemplateSyncAndWaba1712600078000 implements MigrationInterface {
  name = 'WhatsappMetaTemplateSyncAndWaba1712600078000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers"
      ADD COLUMN IF NOT EXISTS "whatsapp_business_account_id" character varying(128) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_meta_templates"
      ADD COLUMN IF NOT EXISTS "components_json" jsonb NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_meta_templates"
      ADD COLUMN IF NOT EXISTS "last_synced_at" timestamptz NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_meta_templates" ALTER COLUMN "template_key" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_meta_templates" DROP CONSTRAINT IF EXISTS "UQ_tenant_whatsapp_meta_templates_tenant_key"
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_tenant_whatsapp_meta_templates_tenant_key_nn"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_tenant_whatsapp_meta_templates_tenant_name_lang"
    `);

    await queryRunner.query(`
      DELETE FROM "tenant_whatsapp_meta_templates" WHERE "template_key" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_meta_templates" ALTER COLUMN "template_key" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_meta_templates" DROP COLUMN IF EXISTS "last_synced_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_meta_templates" DROP COLUMN IF EXISTS "components_json"
    `);

    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_meta_templates"
      ADD CONSTRAINT "UQ_tenant_whatsapp_meta_templates_tenant_key" UNIQUE ("tenant_id", "template_key")
    `);

    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers" DROP COLUMN IF EXISTS "whatsapp_business_account_id"
    `);
  }
}
