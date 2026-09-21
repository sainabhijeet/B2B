import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StorefrontSupportInquiries1712600169000
  implements MigrationInterface
{
  name = 'StorefrontSupportInquiries1712600169000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "support_tickets" ALTER COLUMN "created_by" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "contact_name" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "contact_email" varchar(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "support_tickets" WHERE "created_by" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_tickets" ALTER COLUMN "created_by" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "contact_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "contact_name"`,
    );
  }
}
