import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Optional national (subscriber) number length per country for distributor OTP UI.
 * NULL = client uses platform default (5–14) matching auth DTO.
 */
export class CountryPhoneNationalLength1712600025000 implements MigrationInterface {
  name = 'CountryPhoneNationalLength1712600025000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "phone_national_min" integer NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "phone_national_max" integer NULL
    `);

    await queryRunner.query(`
      UPDATE "countries" SET "phone_national_min" = 10, "phone_national_max" = 10 WHERE "iso_code" = 'IN'
    `);
    await queryRunner.query(`
      UPDATE "countries" SET "phone_national_min" = 10, "phone_national_max" = 10 WHERE "iso_code" = 'US'
    `);
    await queryRunner.query(`
      UPDATE "countries" SET "phone_national_min" = 9, "phone_national_max" = 9 WHERE "iso_code" = 'FR'
    `);
    await queryRunner.query(`
      UPDATE "countries" SET "phone_national_min" = 9, "phone_national_max" = 9 WHERE "iso_code" = 'AE'
    `);
    await queryRunner.query(`
      UPDATE "countries" SET "phone_national_min" = 10, "phone_national_max" = 11 WHERE "iso_code" = 'GB'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN IF EXISTS "phone_national_max"`);
    await queryRunner.query(`ALTER TABLE "countries" DROP COLUMN IF EXISTS "phone_national_min"`);
  }
}
