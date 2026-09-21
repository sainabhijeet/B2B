import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDistributorOnboardingTables1712600029000 implements MigrationInterface {
  name = 'AddDistributorOnboardingTables1712600029000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_onboarding" (
        "tenant_id" uuid NOT NULL,
        "current_step" integer NOT NULL DEFAULT 1,
        "status" varchar(32) NOT NULL DEFAULT 'in_progress',
        "payload_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "completed_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_onboarding" PRIMARY KEY ("tenant_id"),
        CONSTRAINT "FK_tenant_onboarding_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tenant_onboarding_status" ON "tenant_onboarding" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_profiles" (
        "tenant_id" uuid NOT NULL,
        "business_name" varchar(255) NOT NULL DEFAULT '',
        "owner_name" varchar(255) NOT NULL DEFAULT '',
        "industry_id" uuid NULL,
        "gst_number" varchar(64) NULL,
        "country_id" uuid NULL,
        "state_id" uuid NULL,
        "city_id" uuid NULL,
        "address" text NULL,
        "pincode" varchar(32) NULL,
        "phone" varchar(32) NULL,
        "email" varchar(255) NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_profiles" PRIMARY KEY ("tenant_id"),
        CONSTRAINT "FK_tenant_profiles_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_profiles_industry" FOREIGN KEY ("industry_id") REFERENCES "industries"("industry_id") ON DELETE SET NULL,
        CONSTRAINT "FK_tenant_profiles_country" FOREIGN KEY ("country_id") REFERENCES "countries"("country_id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_branding" (
        "tenant_id" uuid NOT NULL,
        "logo_url" text NULL,
        "logo_data_url" text NULL,
        "primary_color" varchar(32) NULL,
        "secondary_color" varchar(32) NULL,
        "tagline" text NULL,
        "theme_id" varchar(64) NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_branding" PRIMARY KEY ("tenant_id"),
        CONSTRAINT "FK_tenant_branding_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_domains" (
        "tenant_id" uuid NOT NULL,
        "domain_type" varchar(32) NOT NULL DEFAULT 'subdomain',
        "subdomain" varchar(128) NULL,
        "custom_domain" varchar(255) NULL,
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_domains" PRIMARY KEY ("tenant_id"),
        CONSTRAINT "FK_tenant_domains_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_apps" (
        "tenant_id" uuid NOT NULL,
        "app_name" varchar(255) NOT NULL DEFAULT '',
        "package_name" varchar(255) NOT NULL DEFAULT '',
        "splash_screen" varchar(64) NULL,
        "icon_url" text NULL,
        "status" varchar(32) NOT NULL DEFAULT 'draft',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_apps" PRIMARY KEY ("tenant_id"),
        CONSTRAINT "FK_tenant_apps_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_apps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_domains"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_branding"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_profiles"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_tenant_onboarding_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_onboarding"`);
  }
}
