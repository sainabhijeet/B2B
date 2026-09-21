import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentRazorpayIds1712600015000 implements MigrationInterface {
  name = 'AddPaymentRazorpayIds1712600015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD COLUMN IF NOT EXISTS "razorpay_order_id" varchar(64),
      ADD COLUMN IF NOT EXISTS "razorpay_payment_id" varchar(64)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_payments_razorpay_order_id"
      ON "payments" ("razorpay_order_id")
      WHERE "razorpay_order_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_payments_razorpay_order_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "razorpay_payment_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "razorpay_order_id"`);
  }
}
