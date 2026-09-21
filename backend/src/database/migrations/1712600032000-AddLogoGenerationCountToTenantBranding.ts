import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLogoGenerationCountToTenantBranding1712600032000 implements MigrationInterface {
  name = 'AddLogoGenerationCountToTenantBranding1712600032000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_branding"
      ADD COLUMN IF NOT EXISTS "logo_generation_count" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_branding" DROP COLUMN IF EXISTS "logo_generation_count"`,
    );
  }
}
