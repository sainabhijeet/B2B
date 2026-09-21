import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantCoupons1712600166000 implements MigrationInterface {
  name = 'TenantCoupons1712600166000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createCouponTables(queryRunner, 'public');
    const tenants: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const tenant of tenants) {
      await this.createCouponTables(queryRunner, tenant.schema_name);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tenants: Array<{ schema_name: string }> = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const tenant of tenants) {
      await this.dropCouponTables(queryRunner, tenant.schema_name);
    }
    await this.dropCouponTables(queryRunner, 'public');
  }

  private async createCouponTables(queryRunner: QueryRunner, schema: string): Promise<void> {
    const q = this.quote(schema);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${q}."tenant_coupons" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "code" varchar(40) NOT NULL,
        "name" varchar(120) NOT NULL,
        "discount_type" varchar(16) NOT NULL,
        "discount_value" numeric(12,2) NOT NULL,
        "minimum_order_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "maximum_discount_amount" numeric(12,2) NULL,
        "starts_at" timestamptz NULL,
        "ends_at" timestamptz NULL,
        "usage_limit" integer NULL,
        "per_customer_limit" integer NOT NULL DEFAULT 1,
        "used_count" integer NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_coupons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_coupons_tenant" FOREIGN KEY ("tenant_id") REFERENCES public."tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_tenant_coupons_type" CHECK ("discount_type" IN ('PERCENTAGE', 'FIXED')),
        CONSTRAINT "CHK_tenant_coupons_values" CHECK (
          "discount_value" > 0 AND "minimum_order_amount" >= 0 AND
          ("maximum_discount_amount" IS NULL OR "maximum_discount_amount" > 0) AND
          ("usage_limit" IS NULL OR "usage_limit" > 0) AND
          "per_customer_limit" > 0 AND "used_count" >= 0
        )
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_tenant_coupons_tenant_code"
      ON ${q}."tenant_coupons" ("tenant_id", "code")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tenant_coupons_active_end"
      ON ${q}."tenant_coupons" ("tenant_id", "active", "ends_at")
    `);

    await queryRunner.query(`ALTER TABLE ${q}."orders" ADD COLUMN IF NOT EXISTS "coupon_id" uuid NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."orders" ADD COLUMN IF NOT EXISTS "coupon_code" varchar(40) NULL`);
    await queryRunner.query(`ALTER TABLE ${q}."orders" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_orders_coupon'
            AND conrelid = '${q}."orders"'::regclass
        ) THEN
          ALTER TABLE ${q}."orders"
          ADD CONSTRAINT "FK_orders_coupon" FOREIGN KEY ("coupon_id")
          REFERENCES ${q}."tenant_coupons"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${q}."coupon_redemptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "coupon_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "customer_id" uuid NULL,
        "discount_amount" numeric(12,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coupon_redemptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_coupon_redemptions_tenant" FOREIGN KEY ("tenant_id") REFERENCES public."tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coupon_redemptions_coupon" FOREIGN KEY ("coupon_id") REFERENCES ${q}."tenant_coupons"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_coupon_redemptions_order" FOREIGN KEY ("order_id") REFERENCES ${q}."orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coupon_redemptions_customer" FOREIGN KEY ("customer_id") REFERENCES public."customers"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_coupon_redemptions_discount" CHECK ("discount_amount" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_coupon_redemptions_tenant_order"
      ON ${q}."coupon_redemptions" ("tenant_id", "order_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_coupon_redemptions_coupon_customer"
      ON ${q}."coupon_redemptions" ("coupon_id", "customer_id")
    `);
  }

  private async dropCouponTables(queryRunner: QueryRunner, schema: string): Promise<void> {
    const q = this.quote(schema);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q}."coupon_redemptions"`);
    await queryRunner.query(`ALTER TABLE ${q}."orders" DROP COLUMN IF EXISTS "discount_amount"`);
    await queryRunner.query(`ALTER TABLE ${q}."orders" DROP COLUMN IF EXISTS "coupon_code"`);
    await queryRunner.query(`ALTER TABLE ${q}."orders" DROP COLUMN IF EXISTS "coupon_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${q}."tenant_coupons"`);
  }

  private quote(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }
}
