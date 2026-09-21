import type { MigrationInterface, QueryRunner } from 'typeorm';

/** When `use_own_token`, Meta verify token + app secret are stored per line (like access_token). */
export class PlatformWhatsappPerLineWebhookSecrets1712600073000 implements MigrationInterface {
  name = 'PlatformWhatsappPerLineWebhookSecrets1712600073000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers"
      ADD COLUMN IF NOT EXISTS "webhook_verify_token" text NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers"
      ADD COLUMN IF NOT EXISTS "app_secret" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers" DROP COLUMN IF EXISTS "app_secret"
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers" DROP COLUMN IF EXISTS "webhook_verify_token"
    `);
  }
}
