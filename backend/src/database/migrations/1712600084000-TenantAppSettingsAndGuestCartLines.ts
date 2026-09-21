import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Mobile storefront policy (public) + optional guest cart lines keyed by device id.
 */
export class TenantAppSettingsAndGuestCartLines1712600084000 implements MigrationInterface {
  name = 'TenantAppSettingsAndGuestCartLines1712600084000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_app_settings" (
        "tenant_id" uuid NOT NULL,
        "allow_guest_access" boolean NOT NULL DEFAULT false,
        "show_prices_to_guest" boolean NOT NULL DEFAULT false,
        "allow_guest_cart" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_app_settings" PRIMARY KEY ("tenant_id"),
        CONSTRAINT "FK_tenant_app_settings_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "guest_cart_lines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "device_id" character varying(255) NOT NULL,
        "product_id" uuid NOT NULL,
        "variant_id" uuid,
        "quantity" integer NOT NULL,
        "price_snapshot" numeric(14,4) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_guest_cart_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_guest_cart_lines_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_guest_cart_line_tenant_device_product_variant"
      ON "guest_cart_lines" ("tenant_id", "device_id", "product_id", (COALESCE("variant_id", '00000000-0000-0000-0000-000000000000'::uuid)))
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_guest_cart_lines_tenant_device"
      ON "guest_cart_lines" ("tenant_id", "device_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_guest_cart_lines_tenant_device"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_guest_cart_line_tenant_device_product_variant"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "guest_cart_lines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_app_settings"`);
  }
}
