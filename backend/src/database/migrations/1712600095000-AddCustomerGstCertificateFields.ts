import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerGstCertificateFields1712600095000 implements MigrationInterface {
  name = 'AddCustomerGstCertificateFields1712600095000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
        ADD COLUMN IF NOT EXISTS "business_legal_name" varchar(512) NULL,
        ADD COLUMN IF NOT EXISTS "gstin" varchar(32) NULL,
        ADD COLUMN IF NOT EXISTS "gst_verified" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "gst_status" varchar(64) NULL,
        ADD COLUMN IF NOT EXISTS "gst_certificate_url" varchar(512) NULL,
        ADD COLUMN IF NOT EXISTS "gst_certificate_file_name" varchar(255) NULL,
        ADD COLUMN IF NOT EXISTS "gst_verified_at" TIMESTAMP WITH TIME ZONE NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
        DROP COLUMN IF EXISTS "gst_verified_at",
        DROP COLUMN IF EXISTS "gst_certificate_file_name",
        DROP COLUMN IF EXISTS "gst_certificate_url",
        DROP COLUMN IF EXISTS "gst_status",
        DROP COLUMN IF EXISTS "gst_verified",
        DROP COLUMN IF EXISTS "gstin",
        DROP COLUMN IF EXISTS "business_legal_name"
    `);
  }
}
