import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationReadState1712600173000 implements MigrationInterface {
  name = 'AddNotificationReadState1712600173000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "read_at" timestamptz NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_notifications_user_tenant_unread_created" ON "notifications" ("tenant_id", "user_id", "created_at" DESC) WHERE "read_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_notifications_user_tenant_unread_created"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN IF EXISTS "read_at"`,
    );
  }
}
