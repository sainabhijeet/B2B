import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaasControlLayer1712600007000 implements MigrationInterface {
  name = 'AddSaasControlLayer1712600007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plan_limits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "plan_name" character varying(32) NOT NULL,
        "max_products" integer NOT NULL DEFAULT 0,
        "max_users" integer NOT NULL DEFAULT 0,
        "max_attributes" integer NOT NULL DEFAULT 0,
        "max_images_per_product" integer NOT NULL DEFAULT 0,
        "notifications_per_day" integer NOT NULL DEFAULT 0,
        "build_priority" character varying(16) NOT NULL DEFAULT 'LOW',
        "ads_enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plan_limits_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plan_limits_plan_name" UNIQUE ("plan_name")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "plan_limits"
      ("plan_name", "max_products", "max_users", "max_attributes", "max_images_per_product", "notifications_per_day", "build_priority", "ads_enabled")
      VALUES
      ('FREE', 100, 5, 20, 5, 100, 'LOW', true),
      ('BASIC', 1000, 25, 100, 10, 1000, 'MEDIUM', false),
      ('PREMIUM', 100000, 1000, 1000, 20, 1000000000, 'HIGH', false)
    `);

    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "plan_name" character varying(32) NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'ACTIVE',
        "start_date" date NOT NULL,
        "expiry_date" date,
        "trial_ends_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_subscriptions_tenant_id" UNIQUE ("tenant_id"),
        CONSTRAINT "FK_subscriptions_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "themes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "theme_name" character varying(128) NOT NULL,
        "theme_type" character varying(64) NOT NULL,
        "theme_config_json" jsonb NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_themes_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tenant_themes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "theme_id" uuid NOT NULL,
        "selected_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_themes_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenant_themes_tenant_id" UNIQUE ("tenant_id"),
        CONSTRAINT "FK_tenant_themes_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_themes_theme_id" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "placement" character varying(64) NOT NULL,
        "image_url" text NOT NULL,
        "redirect_url" text,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ads_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ads"`);
    await queryRunner.query(`DROP TABLE "tenant_themes"`);
    await queryRunner.query(`DROP TABLE "themes"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TABLE "plan_limits"`);
  }
}
