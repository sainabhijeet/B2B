import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Copies tenant-scoped catalog + B2B pricing from `public` into each tenant's
 * Postgres schema (`tenants.schema_name`, e.g. `t_<uuid hex>`), then removes those
 * rows from `public` so the app reads/writes only via `TenantSchemaRunner`.
 *
 * `customers` / `customer_addresses` remain in `public` (FK from `users.customer_id`).
 */
export class MoveTenantCatalogIntoSchemas1712600052000 implements MigrationInterface {
  name = 'MoveTenantCatalogIntoSchemas1712600052000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tenants: { id: string; schema_name: string }[] = await queryRunner.query(
      `SELECT id, schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );

    const tenantTables = [
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
    ];

    for (const { id: tenantId, schema_name: schema } of tenants) {
      const qSch = `"${schema.replace(/"/g, '""')}"`;

      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${qSch}`);

      await queryRunner.query(
        `CREATE TABLE IF NOT EXISTS ${qSch}."_tenant_schema_meta" (
          id integer PRIMARY KEY DEFAULT 1,
          schema_version integer NOT NULL DEFAULT 1,
          migrated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT _tenant_schema_meta_single CHECK (id = 1)
        )`,
      );
      await queryRunner.query(
        `INSERT INTO ${qSch}."_tenant_schema_meta" (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
      );

      for (const tbl of tenantTables) {
        const qt = `"${tbl.replace(/"/g, '""')}"`;
        const reg: { reg: string | null }[] = await queryRunner.query(`SELECT to_regclass('public.${tbl}') AS reg`);
        if (!reg[0]?.reg) continue;
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${qSch}.${qt} (LIKE public.${qt} INCLUDING ALL)`);
      }

      /** Copy rows */
      await queryRunner.query(
        `INSERT INTO ${qSch}."products" SELECT * FROM public.products p WHERE p.tenant_id = $1::uuid ON CONFLICT (id) DO NOTHING`,
        [tenantId],
      );
      await queryRunner.query(
        `INSERT INTO ${qSch}."product_variants" SELECT pv.* FROM public.product_variants pv
         INNER JOIN public.products p ON p.id = pv.product_id AND p.tenant_id = $1::uuid
         ON CONFLICT (id) DO NOTHING`,
        [tenantId],
      );
      await queryRunner.query(
        `INSERT INTO ${qSch}."product_images" SELECT pi.* FROM public.product_images pi
         INNER JOIN public.products p ON p.id = pi.product_id AND p.tenant_id = $1::uuid
         ON CONFLICT (id) DO NOTHING`,
        [tenantId],
      );
      await queryRunner.query(
        `INSERT INTO ${qSch}."inventory" SELECT i.* FROM public.inventory i
         INNER JOIN public.products p ON p.id = i.product_id AND p.tenant_id = $1::uuid
         ON CONFLICT ("id") DO NOTHING`,
        [tenantId],
      );
      await queryRunner.query(
        `INSERT INTO ${qSch}."product_categories" SELECT pc.* FROM public.product_categories pc
         INNER JOIN public.products p ON p.id = pc.product_id AND p.tenant_id = $1::uuid
         ON CONFLICT ("product_id", "category_id") DO NOTHING`,
        [tenantId],
      );
      await queryRunner.query(
        `INSERT INTO ${qSch}."product_variant_attribute_values" SELECT pvav.* FROM public.product_variant_attribute_values pvav
         INNER JOIN public.product_variants pv ON pv.id = pvav.product_variant_id
         INNER JOIN public.products p ON p.id = pv.product_id AND p.tenant_id = $1::uuid
         ON CONFLICT ("product_variant_id", "attribute_value_id") DO NOTHING`,
        [tenantId],
      );

      await queryRunner.query(
        `INSERT INTO ${qSch}."customer_groups" SELECT * FROM public.customer_groups cg WHERE cg.tenant_id = $1::uuid ON CONFLICT (id) DO NOTHING`,
        [tenantId],
      );
      await queryRunner.query(
        `INSERT INTO ${qSch}."customer_group_map" SELECT cgm.* FROM public.customer_group_map cgm
         INNER JOIN public.customer_groups cg ON cg.id = cgm.group_id AND cg.tenant_id = $1::uuid
         ON CONFLICT (customer_id, group_id) DO NOTHING`,
        [tenantId],
      );
      await queryRunner.query(
        `INSERT INTO ${qSch}."customer_prices" SELECT cp.* FROM public.customer_prices cp
         INNER JOIN public.customers c ON c.id = cp.customer_id AND c.tenant_id = $1::uuid
         INNER JOIN public.product_variants pv ON pv.id = cp.product_variant_id
         INNER JOIN public.products p ON p.id = pv.product_id AND p.tenant_id = $1::uuid
         ON CONFLICT (customer_id, product_variant_id) DO NOTHING`,
        [tenantId],
      );
      await queryRunner.query(
        `INSERT INTO ${qSch}."group_prices" SELECT gp.* FROM public.group_prices gp
         INNER JOIN public.customer_groups cg ON cg.id = gp.group_id AND cg.tenant_id = $1::uuid
         ON CONFLICT (group_id, product_variant_id) DO NOTHING`,
        [tenantId],
      );
      await queryRunner.query(
        `INSERT INTO ${qSch}."quantity_prices" SELECT qp.* FROM public.quantity_prices qp
         INNER JOIN public.product_variants pv ON pv.id = qp.product_variant_id
         INNER JOIN public.products p ON p.id = pv.product_id AND p.tenant_id = $1::uuid
         ON CONFLICT (product_variant_id, min_qty) DO NOTHING`,
        [tenantId],
      );

      /** Remove from public (children first) */
      await queryRunner.query(
        `DELETE FROM public.customer_prices cp USING public.product_variants pv, public.products p
         WHERE cp.product_variant_id = pv.id AND pv.product_id = p.id AND p.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(
        `DELETE FROM public.group_prices gp USING public.customer_groups cg
         WHERE gp.group_id = cg.id AND cg.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(
        `DELETE FROM public.quantity_prices qp USING public.product_variants pv, public.products p
         WHERE qp.product_variant_id = pv.id AND pv.product_id = p.id AND p.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(
        `DELETE FROM public.customer_group_map cgm USING public.customer_groups cg
         WHERE cgm.group_id = cg.id AND cg.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(`DELETE FROM public.customer_groups WHERE tenant_id = $1::uuid`, [tenantId]);

      await queryRunner.query(
        `DELETE FROM public.product_variant_attribute_values pvav USING public.product_variants pv, public.products p
         WHERE pvav.product_variant_id = pv.id AND pv.product_id = p.id AND p.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(
        `DELETE FROM public.inventory i USING public.products p WHERE i.product_id = p.id AND p.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(
        `DELETE FROM public.product_images pi USING public.products p WHERE pi.product_id = p.id AND p.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(
        `DELETE FROM public.product_categories pc USING public.products p WHERE pc.product_id = p.id AND p.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(
        `DELETE FROM public.product_variants pv USING public.products p WHERE pv.product_id = p.id AND p.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(`DELETE FROM public.products WHERE tenant_id = $1::uuid`, [tenantId]);

      await queryRunner.query(`UPDATE tenants SET tenant_schema_provisioned = true WHERE id = $1::uuid`, [tenantId]);
    }
  }

  public async down(): Promise<void> {
    /** Irreversible without a snapshot — no-op. */
  }
}
