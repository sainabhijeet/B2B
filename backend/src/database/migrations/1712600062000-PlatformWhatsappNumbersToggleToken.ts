import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformWhatsappNumbersToggleToken1712600062000 implements MigrationInterface {
  name = 'PlatformWhatsappNumbersToggleToken1712600062000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers"
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers"
      ADD COLUMN IF NOT EXISTS "access_token" text NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers"
      ADD COLUMN IF NOT EXISTS "webhook_verified" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers"
      ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers" DROP COLUMN IF EXISTS "created_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers" DROP COLUMN IF EXISTS "webhook_verified"
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers" DROP COLUMN IF EXISTS "access_token"
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers" DROP COLUMN IF EXISTS "is_active"
    `);
  }
}
