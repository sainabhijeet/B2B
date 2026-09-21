import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantWhatsappTemplateMappingIsActive1712600082000 implements MigrationInterface {
  name = 'TenantWhatsappTemplateMappingIsActive1712600082000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_template_mapping"
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_whatsapp_template_mapping"
      DROP COLUMN IF EXISTS "is_active"
    `);
  }
}
