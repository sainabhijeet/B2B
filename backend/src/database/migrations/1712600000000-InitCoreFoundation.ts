import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCoreFoundation1712600000000 implements MigrationInterface {
  name = 'InitCoreFoundation1712600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."tenants_status_enum" AS ENUM('active', 'suspended');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM(
          'SUPER_ADMIN',
          'PLATFORM_SUPPORT',
          'OWNER',
          'MANAGER',
          'STAFF',
          'CUSTOMER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(32) NOT NULL,
        "name" varchar(255) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plans_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plans_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" varchar(64) NOT NULL,
        "name" varchar(255) NOT NULL,
        "status" "public"."tenants_status_enum" NOT NULL DEFAULT 'active',
        "plan_id" uuid NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_tenants_plan" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NULL,
        "email" varchar(255) NULL,
        "phone" varchar(32) NULL,
        "password_hash" varchar(255) NULL,
        "role" "public"."users_role_enum" NOT NULL,
        "deleted_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_tenant_email" 
      ON "users" ("tenant_id", "email")
      WHERE "email" IS NOT NULL AND "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_tenant_phone" 
      ON "users" ("tenant_id", "phone")
      WHERE "tenant_id" IS NOT NULL AND "phone" IS NOT NULL AND "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_platform_email" 
      ON "users" ("email")
      WHERE "tenant_id" IS NULL AND "email" IS NOT NULL AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "device_id" varchar(128) NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_refresh_tokens_user_hash" 
      ON "refresh_tokens" ("user_id", "token_hash")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "otp_challenges" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "phone" varchar(20) NOT NULL,
        "code_hash" varchar(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "attempts" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_otp_challenges_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_otp_phone_expires" 
      ON "otp_challenges" ("phone", "expires_at")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_password_reset_hash" 
      ON "password_reset_tokens" ("token_hash")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_config" (
        "key" varchar(128) NOT NULL,
        "value" text NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_system_config_key" PRIMARY KEY ("key")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "plans" ("code", "name")
      VALUES ('FREE', 'Free'), ('BASIC', 'Basic'), ('PREMIUM', 'Premium')
      ON CONFLICT ("code") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "system_config"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_password_reset_hash"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_otp_phone_expires"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "otp_challenges"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_user_hash"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_platform_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_tenant_phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_tenant_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plans"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tenants_status_enum"`);
  }
}
