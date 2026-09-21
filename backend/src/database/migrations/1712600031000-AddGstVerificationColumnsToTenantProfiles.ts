import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGstVerificationColumnsToTenantProfiles1712600031000 implements MigrationInterface {
  name = 'AddGstVerificationColumnsToTenantProfiles1712600031000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_profiles"
      ADD COLUMN IF NOT EXISTS "gst_verified" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_profiles"
      ADD COLUMN IF NOT EXISTS "gst_legal_name" varchar(512) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_profiles"
      ADD COLUMN IF NOT EXISTS "gst_state" varchar(255) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_profiles"
      ADD COLUMN IF NOT EXISTS "gst_status" varchar(64) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenant_profiles" DROP COLUMN IF EXISTS "gst_status"`);
    await queryRunner.query(`ALTER TABLE "tenant_profiles" DROP COLUMN IF EXISTS "gst_state"`);
    await queryRunner.query(`ALTER TABLE "tenant_profiles" DROP COLUMN IF EXISTS "gst_legal_name"`);
    await queryRunner.query(`ALTER TABLE "tenant_profiles" DROP COLUMN IF EXISTS "gst_verified"`);
  }
}
