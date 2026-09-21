import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensures `GET /countries` returns rows without a separate `countries:seed` run.
 * Idempotent: skips rows that already exist (unique `iso_code`).
 */
export class SeedDefaultCountries1712600024000 implements MigrationInterface {
  name = 'SeedDefaultCountries1712600024000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "countries" (
        "name",
        "iso_code",
        "phone_code",
        "currency",
        "default_language",
        "status",
        "timezone",
        "currency_symbol",
        "tax_system"
      ) VALUES
        ('India', 'IN', '+91', 'INR', 'hi', 'active', 'Asia/Kolkata', NULL, 'GST'),
        ('France', 'FR', '+33', 'EUR', 'fr', 'active', 'Europe/Paris', NULL, 'VAT'),
        ('United States', 'US', '+1', 'USD', 'en', 'active', 'America/New_York', NULL, 'Sales tax (state)'),
        ('United Arab Emirates', 'AE', '+971', 'AED', 'ar', 'active', 'Asia/Dubai', NULL, 'VAT'),
        ('United Kingdom', 'GB', '+44', 'GBP', 'en', 'active', 'Europe/London', NULL, 'VAT')
      ON CONFLICT ("iso_code") DO NOTHING
    `);
  }

  public async down(): Promise<void> {
    /* keep rows */
  }
}
