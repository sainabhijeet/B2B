import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationControlLayer1712600010000 implements MigrationInterface {
  name = 'AddNotificationControlLayer1712600010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_device_tokens"
      ADD COLUMN IF NOT EXISTS "tenant_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "user_device_tokens"
      ADD COLUMN IF NOT EXISTS "device_type" varchar(16) NOT NULL DEFAULT 'ANDROID'
    `);
    await queryRunner.query(`
      ALTER TABLE "user_device_tokens"
      ADD COLUMN IF NOT EXISTS "app_version" varchar(32) NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_device_tokens_tenant_status"
      ON "user_device_tokens" ("tenant_id", "status")
    `);

    await queryRunner.query(`
      UPDATE "user_device_tokens" udt
      SET "tenant_id" = u."tenant_id"
      FROM "users" u
      WHERE udt."user_id" = u."id" AND udt."tenant_id" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_push_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "provider" varchar(32) NOT NULL DEFAULT 'firebase',
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_push_configs_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenant_push_configs_tenant_id" UNIQUE ("tenant_id"),
        CONSTRAINT "FK_tenant_push_configs_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_push_configs"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_device_tokens_tenant_status"`);
    await queryRunner.query(`ALTER TABLE "user_device_tokens" DROP COLUMN IF EXISTS "app_version"`);
    await queryRunner.query(`ALTER TABLE "user_device_tokens" DROP COLUMN IF EXISTS "device_type"`);
    await queryRunner.query(`ALTER TABLE "user_device_tokens" DROP COLUMN IF EXISTS "tenant_id"`);
  }
}
