import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OtpPurposeTenantAndUserPhoneVerified1712600023000 implements MigrationInterface {
  name = 'OtpPurposeTenantAndUserPhoneVerified1712600023000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified_at" TIMESTAMPTZ NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "otp_challenges" ADD COLUMN IF NOT EXISTS "purpose" varchar(40) NOT NULL DEFAULT 'customer_tenant'
    `);
    await queryRunner.query(`
      ALTER TABLE "otp_challenges" ADD COLUMN IF NOT EXISTS "tenant_id" uuid NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "otp_challenges"
        ADD CONSTRAINT "FK_otp_challenges_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_otp_challenges_purpose_tenant_phone"
      ON "otp_challenges" ("purpose", "tenant_id", "phone")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_otp_challenges_purpose_tenant_phone"`);
    await queryRunner.query(`
      ALTER TABLE "otp_challenges" DROP CONSTRAINT IF EXISTS "FK_otp_challenges_tenant"
    `);
    await queryRunner.query(`ALTER TABLE "otp_challenges" DROP COLUMN IF EXISTS "tenant_id"`);
    await queryRunner.query(`ALTER TABLE "otp_challenges" DROP COLUMN IF EXISTS "purpose"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_verified_at"`);
  }
}
