import 'dotenv/config';
import dataSource from '../database/data-source';
import { Tenant } from '../common/entities/tenant.entity';
import { computeTenantSchemaName } from '../tenancy/tenant-schema.service';

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function ensureSchemaAndTables(schemaName: string): Promise<void> {
  if (!/^t_[a-f0-9]{32}$/.test(schemaName)) {
    throw new Error(`Invalid tenant schema name: ${schemaName}`);
  }
  const qSchema = quoteIdent(schemaName);
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS ${qSchema}`);
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS ${qSchema}._tenant_schema_meta (
      id integer PRIMARY KEY DEFAULT 1,
      schema_version integer NOT NULL DEFAULT 1,
      migrated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT _tenant_schema_meta_single CHECK (id = 1)
    )
  `);
  await dataSource.query(
    `INSERT INTO ${qSchema}._tenant_schema_meta (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
  );

  const tables = [
    'brands',
    'products',
    'product_variants',
    'product_images',
    'inventory',
    'product_categories',
    'product_variant_attribute_values',
    'customer_groups',
    'customer_group_map',
    'customer_prices',
    'group_prices',
    'quantity_prices',
    'cart',
    'cart_items',
    'orders',
    'order_items',
    'invoices',
    'invoice_items',
    'order_payments',
    'order_requests',
    'replacement_shipments',
    'tenant_coupons',
    'coupon_redemptions',
  ];
  for (const table of tables) {
    await dataSource.query(
      `CREATE TABLE IF NOT EXISTS ${qSchema}.${quoteIdent(table)} (LIKE public.${quoteIdent(table)} INCLUDING ALL)`,
    );
  }
  await dataSource.query(`ALTER TABLE ${qSchema}."order_requests" DROP CONSTRAINT IF EXISTS "FK_order_requests_distributor"`);
  await dataSource.query(`ALTER TABLE ${qSchema}."order_requests" ADD CONSTRAINT "FK_order_requests_distributor" FOREIGN KEY ("distributor_id") REFERENCES public."tenants"("id") ON DELETE CASCADE`);
  await dataSource.query(`ALTER TABLE ${qSchema}."replacement_shipments" DROP CONSTRAINT IF EXISTS "FK_replacement_shipments_tenant", DROP CONSTRAINT IF EXISTS "FK_replacement_shipments_order", DROP CONSTRAINT IF EXISTS "FK_replacement_shipments_request", DROP CONSTRAINT IF EXISTS "FK_replacement_shipments_created_by"`);
  await dataSource.query(`ALTER TABLE ${qSchema}."replacement_shipments" ADD CONSTRAINT "FK_replacement_shipments_tenant" FOREIGN KEY ("tenant_id") REFERENCES public."tenants"("id") ON DELETE CASCADE, ADD CONSTRAINT "FK_replacement_shipments_order" FOREIGN KEY ("order_id") REFERENCES ${qSchema}."orders"("id") ON DELETE CASCADE, ADD CONSTRAINT "FK_replacement_shipments_request" FOREIGN KEY ("request_id") REFERENCES ${qSchema}."order_requests"("id") ON DELETE CASCADE, ADD CONSTRAINT "FK_replacement_shipments_created_by" FOREIGN KEY ("created_by") REFERENCES public."users"("id") ON DELETE RESTRICT`);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS ${qSchema}."top_products" (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      variant_id uuid NOT NULL,
      position integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_top_products" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_top_products_variant" UNIQUE ("variant_id"),
      CONSTRAINT "FK_top_products_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_top_products_variant" FOREIGN KEY ("variant_id") REFERENCES ${qSchema}."product_variants"("id") ON DELETE CASCADE
    )
  `);
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS "idx_top_products_tenant_position"
    ON ${qSchema}."top_products" ("tenant_id", "position" ASC, "created_at" ASC)
  `);
}

async function run() {
  await dataSource.initialize();
  const tenantRepo = dataSource.getRepository(Tenant);
  const tenants = await tenantRepo.find();
  for (const tenant of tenants) {
    const schemaName = computeTenantSchemaName(tenant.id);
    await tenantRepo.update({ id: tenant.id }, { schemaName });
    await ensureSchemaAndTables(schemaName);
    await tenantRepo.update(
      { id: tenant.id },
      { tenantSchemaProvisioned: true },
    );
    console.log(`[tenant-schema] provisioned ${tenant.slug} ${schemaName}`);
  }
  await dataSource.destroy();
}

run().catch(async (error) => {
  console.error('[tenant-schema] failed:', error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
