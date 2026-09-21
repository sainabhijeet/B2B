import type { MigrationInterface, QueryRunner } from 'typeorm';

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Curated `top_products` (variant-level) per tenant schema for WhatsApp / distributor quick picks.
 */
export class AddTopProductsToTenantSchemas1712600070000 implements MigrationInterface {
  name = 'AddTopProductsToTenantSchemas1712600070000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tenants: { id: string; schema_name: string }[] = await queryRunner.query(
      `SELECT id, schema_name FROM tenants WHERE tenant_schema_provisioned = true AND schema_name ~ '^t_[a-f0-9]{32}$'`,
    );

    for (const { id: tenantId, schema_name: schema } of tenants) {
      const qSch = quoteIdent(schema);
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS ${qSch}.top_products (
          id uuid NOT NULL DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL,
          variant_id uuid NOT NULL,
          position integer NOT NULL DEFAULT 0,
          is_active boolean NOT NULL DEFAULT true,
          created_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT "PK_top_products" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_top_products_variant" UNIQUE ("variant_id"),
          CONSTRAINT "FK_top_products_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_top_products_variant" FOREIGN KEY ("variant_id") REFERENCES ${qSch}."product_variants"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_top_products_tenant_position"
        ON ${qSch}.top_products ("tenant_id", "position" ASC, "created_at" ASC)
      `);
      await queryRunner.query(
        `COMMENT ON TABLE ${qSch}.top_products IS 'Distributor top picks (variant_id); WhatsApp TOP_PRODUCTS + storefront.'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tenants: { schema_name: string }[] = await queryRunner.query(
      `SELECT schema_name FROM tenants WHERE tenant_schema_provisioned = true AND schema_name ~ '^t_[a-f0-9]{32}$'`,
    );
    for (const { schema_name: schema } of tenants) {
      const qSch = quoteIdent(schema);
      await queryRunner.query(`DROP TABLE IF EXISTS ${qSch}.top_products`);
    }
  }
}
