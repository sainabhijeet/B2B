import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantCoupons1712600183000 implements MigrationInterface {
  name = 'TenantCoupons1712600183000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schemas = await this.getSchemas(queryRunner);
    for (const schema of schemas) {
      await this.ensureCouponTables(queryRunner, schema);
      await this.ensureOrderColumns(queryRunner, schema);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schemas = await this.getSchemas(queryRunner);
    for (const schema of schemas.reverse()) {
      await queryRunner.query(
        `ALTER TABLE ${this.q(schema)}."orders" DROP CONSTRAINT IF EXISTS "FK_orders_coupon"`,
      );
      await queryRunner.query(
        `ALTER TABLE ${this.q(schema)}."orders" DROP COLUMN IF EXISTS "discount_amount"`,
      );
      await queryRunner.query(
        `ALTER TABLE ${this.q(schema)}."orders" DROP COLUMN IF EXISTS "coupon_code"`,
      );
      await queryRunner.query(
        `ALTER TABLE ${this.q(schema)}."orders" DROP COLUMN IF EXISTS "coupon_id"`,
      );
      await queryRunner.query(
        `DROP TABLE IF EXISTS ${this.q(schema)}."coupon_redemptions"`,
      );
      await queryRunner.query(
        `DROP TABLE IF EXISTS ${this.q(schema)}."tenant_coupons"`,
      );
    }
  }

  private async getSchemas(queryRunner: QueryRunner): Promise<string[]> {
    const schemas = new Set<string>(['public']);
    const hasTenants = await queryRunner.query(`
      SELECT to_regclass('public.tenants') AS regclass
    `);
    if (hasTenants?.[0]?.regclass) {
      const tenants = await queryRunner.query(`
        SELECT schema_name
        FROM public.tenants
        WHERE schema_name ~ '^t_[a-f0-9]{32}$'
          AND tenant_schema_provisioned = true
          AND to_regnamespace(schema_name) IS NOT NULL
        ORDER BY schema_name
      `);
      for (const row of tenants) schemas.add(row.schema_name);
    }
    return [...schemas];
  }

  private async ensureCouponTables(
    queryRunner: QueryRunner,
    schema: string,
  ): Promise<void> {
    const q = this.q(schema);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${q}."tenant_coupons" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "code" varchar(40) NOT NULL,
        "name" varchar(160) NOT NULL,
        "discount_type" varchar(16) NOT NULL,
        "discount_value" numeric(12,2) NOT NULL,
        "minimum_order_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "maximum_discount_amount" numeric(12,2),
        "starts_at" timestamptz,
        "ends_at" timestamptz,
        "usage_limit" integer,
        "per_customer_limit" integer,
        "used_count" integer NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_tenant_coupons_discount_type" CHECK ("discount_type" IN ('PERCENTAGE', 'FIXED')),
        CONSTRAINT "CHK_tenant_coupons_discount_value" CHECK ("discount_value" > 0),
        CONSTRAINT "CHK_tenant_coupons_min_order" CHECK ("minimum_order_amount" >= 0),
        CONSTRAINT "CHK_tenant_coupons_max_discount" CHECK ("maximum_discount_amount" IS NULL OR "maximum_discount_amount" > 0),
        CONSTRAINT "CHK_tenant_coupons_usage_limit" CHECK ("usage_limit" IS NULL OR "usage_limit" > 0),
        CONSTRAINT "CHK_tenant_coupons_per_customer_limit" CHECK ("per_customer_limit" IS NULL OR "per_customer_limit" > 0),
        CONSTRAINT "CHK_tenant_coupons_used_count" CHECK ("used_count" >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tenant_coupons_tenant_code"
      ON ${q}."tenant_coupons" ("tenant_id", "code")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tenant_coupons_active_ends"
      ON ${q}."tenant_coupons" ("tenant_id", "active", "ends_at")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${q}."coupon_redemptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "coupon_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "customer_id" uuid,
        "discount_amount" numeric(12,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_coupon_redemptions_coupon" FOREIGN KEY ("coupon_id") REFERENCES ${q}."tenant_coupons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coupon_redemptions_order" FOREIGN KEY ("order_id") REFERENCES ${q}."orders"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_coupon_redemptions_tenant_order"
      ON ${q}."coupon_redemptions" ("tenant_id", "order_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_coupon_redemptions_coupon_customer"
      ON ${q}."coupon_redemptions" ("coupon_id", "customer_id")
    `);
  }

  private async ensureOrderColumns(
    queryRunner: QueryRunner,
    schema: string,
  ): Promise<void> {
    const q = this.q(schema);
    await queryRunner.query(`
      ALTER TABLE ${q}."orders"
      ADD COLUMN IF NOT EXISTS "coupon_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE ${q}."orders"
      ADD COLUMN IF NOT EXISTS "coupon_code" varchar(40)
    `);
    await queryRunner.query(`
      ALTER TABLE ${q}."orders"
      ADD COLUMN IF NOT EXISTS "discount_amount" numeric(12,2) NOT NULL DEFAULT 0
    `);
    // Catching PostgreSQL's duplicate-object error is not sufficient inside a
    // migration transaction: the first failed statement aborts the transaction
    // before JavaScript can continue. Check the schema-qualified table first so
    // this compatibility migration also works after the original coupon
    // migration has already created the foreign key.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_orders_coupon'
            AND conrelid = '${q}."orders"'::regclass
        ) THEN
          ALTER TABLE ${q}."orders"
          ADD CONSTRAINT "FK_orders_coupon"
          FOREIGN KEY ("coupon_id") REFERENCES ${q}."tenant_coupons"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
  }

  private q(schema: string): string {
    return `"${schema.replace(/"/g, '""')}"`;
  }
}
