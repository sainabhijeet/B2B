import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Hybrid Meta token: per-line `access_token` when `use_own_token`, else platform shared env token. */
export class PlatformWhatsappNumbersUseOwnToken1712600072000 implements MigrationInterface {
  name = 'PlatformWhatsappNumbersUseOwnToken1712600072000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers"
      ADD COLUMN IF NOT EXISTS "use_own_token" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers" DROP COLUMN IF EXISTS "use_own_token"
    `);
  }
}
