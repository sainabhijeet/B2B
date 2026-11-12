import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds guest storefront support inquiry fields to the existing support_tickets table.
 * This is additive and reuses the existing support ticket system.
 */
export class StorefrontSupportInquiries1712600182000 implements MigrationInterface {
  name = 'StorefrontSupportInquiries1712600182000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE public."support_tickets" ALTER COLUMN "created_by" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE public."support_tickets" ADD COLUMN IF NOT EXISTS "contact_name" varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE public."support_tickets" ADD COLUMN IF NOT EXISTS "contact_email" varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM public."support_tickets" WHERE "created_by" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE public."support_tickets" ALTER COLUMN "created_by" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE public."support_tickets" DROP COLUMN IF EXISTS "contact_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE public."support_tickets" DROP COLUMN IF EXISTS "contact_name"`,
    );
  }
}
