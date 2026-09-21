import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountriesTable1712600020000 implements MigrationInterface {
  name = 'AddCountriesTable1712600020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "countries" (
        "country_id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "iso_code" varchar(2) NOT NULL,
        "phone_code" varchar(16) NOT NULL,
        "currency" varchar(3) NOT NULL,
        "default_language" varchar(32) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'active',
        "timezone" varchar(64) NULL,
        "currency_symbol" varchar(16) NULL,
        "tax_system" varchar(64) NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_countries" PRIMARY KEY ("country_id"),
        CONSTRAINT "UQ_countries_iso_code" UNIQUE ("iso_code")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_countries_status" ON "countries" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "countries"`);
  }
}
