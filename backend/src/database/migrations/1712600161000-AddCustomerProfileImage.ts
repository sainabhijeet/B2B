import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerProfileImage1712600161000 implements MigrationInterface {
  name = 'AddCustomerProfileImage1712600161000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "profile_image_url" varchar(512)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "customers"
      DROP COLUMN IF EXISTS "profile_image_url"
    `);
  }
}
