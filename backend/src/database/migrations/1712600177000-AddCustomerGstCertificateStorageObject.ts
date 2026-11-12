import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerGstCertificateStorageObject1712600177000 implements MigrationInterface {
  name = 'AddCustomerGstCertificateStorageObject1712600177000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "gst_certificate_storage_object_id" uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "gst_certificate_file_name" varchar(255) NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_gst_certificate_storage_object_id"
      ON "customers" ("gst_certificate_storage_object_id")
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_customers_gst_certificate_storage_object_id'
        ) THEN
          ALTER TABLE "customers"
          ADD CONSTRAINT "FK_customers_gst_certificate_storage_object_id"
          FOREIGN KEY ("gst_certificate_storage_object_id") REFERENCES "storage_objects"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP CONSTRAINT IF EXISTS "FK_customers_gst_certificate_storage_object_id"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customers_gst_certificate_storage_object_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "gst_certificate_file_name"
    `);
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "gst_certificate_storage_object_id"
    `);
  }
}
