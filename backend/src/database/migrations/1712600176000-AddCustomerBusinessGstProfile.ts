import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerBusinessGstProfile1712600176000 implements MigrationInterface {
  name = 'AddCustomerBusinessGstProfile1712600176000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "business_legal_name" varchar(512) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "gstin" varchar(32) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "gst_verified" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "gst_status" varchar(64) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "gst_verified_at" timestamptz NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customers_tenant_gstin"
      ON "customers" ("tenant_id", "gstin")
      WHERE "gstin" IS NOT NULL AND "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customers_tenant_gstin"`,
    );
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "gst_verified_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "gst_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "gst_verified"
    `);
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "gstin"
    `);
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "business_legal_name"
    `);
  }
}
