import 'dotenv/config';
import dataSource from '../database/data-source';
import { Tenant } from '../common/entities/tenant.entity';
import { computeTenantSchemaName } from '../tenancy/tenant-schema.service';

const REQUIRED_TABLES = [
  '_tenant_schema_meta',
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
  'top_products',
] as const;

async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    const tenants = await dataSource.getRepository(Tenant).find({
      order: { createdAt: 'ASC' },
    });
    let unhealthy = 0;

    for (const tenant of tenants) {
      const expectedSchema = computeTenantSchemaName(tenant.id);
      const schemaValid = tenant.schemaName === expectedSchema;
      const rows = schemaValid
        ? ((await dataSource.query(
            `SELECT table_name AS "tableName"
             FROM information_schema.tables
             WHERE table_schema = $1`,
            [tenant.schemaName],
          )) as Array<{ tableName: string }>)
        : [];
      const existing = new Set(rows.map((row) => row.tableName));
      const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));
      const healthy =
        schemaValid && tenant.tenantSchemaProvisioned && missing.length === 0;
      if (!healthy) unhealthy += 1;

      console.log(
        JSON.stringify({
          tenantId: tenant.id,
          slug: tenant.slug,
          schemaName: tenant.schemaName,
          expectedSchema,
          provisioned: tenant.tenantSchemaProvisioned,
          missingTables: missing,
          healthy,
        }),
      );
    }

    console.log(
      `[tenant-schema-audit] tenants=${tenants.length} healthy=${tenants.length - unhealthy} unhealthy=${unhealthy}`,
    );
    if (unhealthy > 0) process.exitCode = 2;
  } finally {
    await dataSource.destroy();
  }
}

void run().catch(async (error) => {
  console.error('[tenant-schema-audit] failed:', error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exitCode = 1;
});
