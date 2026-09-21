import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformWhatsappSyncErrorAndLastSent1712600080000 implements MigrationInterface {
  name = 'PlatformWhatsappSyncErrorAndLastSent1712600080000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers"
      ADD COLUMN IF NOT EXISTS "last_meta_sync_error" text NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers"
      ADD COLUMN IF NOT EXISTS "last_meta_sync_at" timestamptz NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers"
      ADD COLUMN IF NOT EXISTS "last_message_sent_at" timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers" DROP COLUMN IF EXISTS "last_message_sent_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers" DROP COLUMN IF EXISTS "last_meta_sync_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "platform_whatsapp_numbers" DROP COLUMN IF EXISTS "last_meta_sync_error"
    `);
  }
}
