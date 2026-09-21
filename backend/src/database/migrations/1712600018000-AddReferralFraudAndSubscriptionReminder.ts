import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferralFraudAndSubscriptionReminder1712600018000 implements MigrationInterface {
  name = 'AddReferralFraudAndSubscriptionReminder1712600018000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "referral_conversions"
      ADD COLUMN IF NOT EXISTS "client_ip" varchar(45),
      ADD COLUMN IF NOT EXISTS "fraud_flag" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "last_expiry_reminder_sent_at" TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "last_expiry_reminder_sent_at"`);
    await queryRunner.query(`ALTER TABLE "referral_conversions" DROP COLUMN IF EXISTS "fraud_flag"`);
    await queryRunner.query(`ALTER TABLE "referral_conversions" DROP COLUMN IF EXISTS "client_ip"`);
  }
}
