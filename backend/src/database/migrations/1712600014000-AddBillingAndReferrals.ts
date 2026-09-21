import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillingAndReferrals1712600014000 implements MigrationInterface {
  name = 'AddBillingAndReferrals1712600014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "plans"
      ADD COLUMN IF NOT EXISTS "price" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "billing_cycle" varchar(16) NOT NULL DEFAULT 'YEARLY',
      ADD COLUMN IF NOT EXISTS "features" jsonb,
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "plan_id" uuid,
      ADD COLUMN IF NOT EXISTS "end_date" date
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "subscription_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "payment_method" varchar(32) NOT NULL,
        "payment_status" varchar(16) NOT NULL DEFAULT 'PENDING',
        "transaction_reference" varchar(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payments_tenant_created" ON "payments" ("tenant_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_invoices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "subscription_id" uuid NOT NULL,
        "invoice_number" varchar(64) NOT NULL UNIQUE,
        "amount" numeric(12,2) NOT NULL,
        "currency" varchar(8) NOT NULL DEFAULT 'INR',
        "status" varchar(16) NOT NULL DEFAULT 'GENERATED',
        "pdf_url" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_billing_invoices_tenant_created" ON "billing_invoices" ("tenant_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_codes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "code" varchar(64) NOT NULL UNIQUE,
        "status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_referral_codes_user" ON "referral_codes" ("user_id")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_conversions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "referrer_user_id" uuid NOT NULL,
        "referred_tenant_id" uuid NOT NULL,
        "subscription_id" uuid,
        "status" varchar(24) NOT NULL DEFAULT 'REGISTERED',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_referral_conversions_referrer_created"
      ON "referral_conversions" ("referrer_user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_commissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "referrer_user_id" uuid NOT NULL,
        "conversion_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_referral_commissions_referrer_created"
      ON "referral_commissions" ("referrer_user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "referral_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "commission_percent" numeric(5,2) NOT NULL DEFAULT 10,
        "minimum_payout" numeric(12,2) NOT NULL DEFAULT 1000,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      UPDATE "plans"
      SET
        "price" = CASE "code"
          WHEN 'FREE' THEN 0
          WHEN 'BASIC' THEN 1999
          WHEN 'PREMIUM' THEN 4999
          ELSE "price"
        END,
        "billing_cycle" = 'YEARLY',
        "features" = CASE "code"
          WHEN 'FREE' THEN '{"notifications_per_day":100,"build_priority":"LOW","ads_enabled":true}'::jsonb
          WHEN 'BASIC' THEN '{"notifications_per_day":1000,"build_priority":"MEDIUM","ads_enabled":false}'::jsonb
          WHEN 'PREMIUM' THEN '{"notifications_per_day":-1,"build_priority":"HIGH","ads_enabled":false}'::jsonb
          ELSE "features"
        END
      WHERE "code" IN ('FREE','BASIC','PREMIUM')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_commissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_conversions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "referral_codes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "billing_invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "end_date"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "plan_id"`);
    await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN IF EXISTS "is_active"`);
    await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN IF EXISTS "features"`);
    await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN IF EXISTS "billing_cycle"`);
    await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN IF EXISTS "price"`);
  }
}
