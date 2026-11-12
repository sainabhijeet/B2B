import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantPaymentSettings1712600178000 implements MigrationInterface {
  name = 'AddTenantPaymentSettings1712600178000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_payment_settings" (
        "tenant_id" uuid NOT NULL,
        "account_holder_name" varchar(255),
        "bank_name" varchar(255),
        "account_number_encrypted" text,
        "account_number_last4" varchar(4),
        "ifsc" varchar(32),
        "branch" varchar(255),
        "upi_id" varchar(255),
        "updated_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_payment_settings" PRIMARY KEY ("tenant_id"),
        CONSTRAINT "FK_tenant_payment_settings_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_payment_settings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_tenant_payment_settings_account_last4" CHECK ("account_number_last4" IS NULL OR "account_number_last4" ~ '^[0-9]{4}$'),
        CONSTRAINT "CHK_tenant_payment_settings_ifsc" CHECK ("ifsc" IS NULL OR "ifsc" ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
        CONSTRAINT "CHK_tenant_payment_settings_upi" CHECK ("upi_id" IS NULL OR "upi_id" ~ '^[A-Za-z0-9._-]{2,128}@[A-Za-z][A-Za-z0-9._-]{2,64}$')
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tenant_payment_settings_updated_by"
      ON "tenant_payment_settings" ("updated_by")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tenant_payment_settings_updated_by"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_payment_settings"`);
  }
}
