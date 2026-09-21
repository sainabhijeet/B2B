import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * B2B commerce in tenant schema: `cart`, `cart_items`, `orders`, `order_items`,
 * `invoices`, `invoice_items`, `order_payments`.
 *
 * Adds `inventory.reserved_stock`, `order_items.variant_sku`, creates `invoice_items` in public.
 * Repoints FKs on tenant copies from `public.*` to `"t_…".*` where catalog lives.
 * `invoice_settings` stays in `public`.
 */
export class TenantCommerceCartOrdersInvoices1712600053000 implements MigrationInterface {
  name = 'TenantCommerceCartOrdersInvoices1712600053000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inventory"
      ADD COLUMN IF NOT EXISTS "reserved_stock" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD COLUMN IF NOT EXISTS "variant_sku" varchar(128) NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoice_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "invoice_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "variant_id" uuid NULL,
        "variant_sku" varchar(128) NULL,
        "quantity" int NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "tax_rate" numeric(5,2) NOT NULL DEFAULT 0,
        "tax_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "total_price" numeric(12,2) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoice_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invoice_items_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invoice_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invoice_items_variant" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL
      )
    `);

    const tenants: { id: string; schema_name: string }[] = await queryRunner.query(
      `SELECT id, schema_name FROM tenants WHERE schema_name ~ '^t_[a-f0-9]{32}$'`,
    );

    const commerceTables = [
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'invoices',
      'invoice_items',
      'order_payments',
    ];

    for (const { id: tenantId, schema_name: schema } of tenants) {
      const qSch = `"${schema.replace(/"/g, '""')}"`;

      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${qSch}`);

      await queryRunner.query(`
        ALTER TABLE ${qSch}."inventory"
        ADD COLUMN IF NOT EXISTS "reserved_stock" integer NOT NULL DEFAULT 0
      `);

      for (const tbl of commerceTables) {
        const qt = `"${tbl.replace(/"/g, '""')}"`;
        const reg: { reg: string | null }[] = await queryRunner.query(`SELECT to_regclass('public.${tbl}') AS reg`);
        if (!reg[0]?.reg) continue;
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${qSch}.${qt} (LIKE public.${qt} INCLUDING ALL)`);
      }

      await this.repointTenantCommerceFks(queryRunner, qSch);

      await queryRunner.query(`SET session_replication_role = 'replica'`);
      try {
        await queryRunner.query(
          `INSERT INTO ${qSch}."cart" SELECT * FROM public.cart c WHERE c.tenant_id = $1::uuid ON CONFLICT (id) DO NOTHING`,
          [tenantId],
        );
        await queryRunner.query(
          `INSERT INTO ${qSch}."cart_items" SELECT ci.* FROM public.cart_items ci
           INNER JOIN public.cart c ON c.id = ci.cart_id AND c.tenant_id = $1::uuid
           ON CONFLICT (id) DO NOTHING`,
          [tenantId],
        );
        await queryRunner.query(
          `INSERT INTO ${qSch}."orders" SELECT * FROM public.orders o WHERE o.tenant_id = $1::uuid ON CONFLICT (id) DO NOTHING`,
          [tenantId],
        );
        await queryRunner.query(
          `INSERT INTO ${qSch}."order_items" SELECT oi.* FROM public.order_items oi
           INNER JOIN public.orders o ON o.id = oi.order_id AND o.tenant_id = $1::uuid
           ON CONFLICT (id) DO NOTHING`,
          [tenantId],
        );
        await queryRunner.query(
          `INSERT INTO ${qSch}."invoices" SELECT * FROM public.invoices inv WHERE inv.tenant_id = $1::uuid ON CONFLICT (id) DO NOTHING`,
          [tenantId],
        );
        await queryRunner.query(
          `INSERT INTO ${qSch}."invoice_items" SELECT ii.* FROM public.invoice_items ii
           INNER JOIN public.invoices inv ON inv.id = ii.invoice_id AND inv.tenant_id = $1::uuid
           ON CONFLICT (id) DO NOTHING`,
          [tenantId],
        );
        await queryRunner.query(
          `INSERT INTO ${qSch}."order_payments" SELECT op.* FROM public.order_payments op
           INNER JOIN public.orders o ON o.id = op.order_id AND o.tenant_id = $1::uuid
           ON CONFLICT (id) DO NOTHING`,
          [tenantId],
        );
      } finally {
        await queryRunner.query(`SET session_replication_role = 'origin'`);
      }

      await queryRunner.query(
        `DELETE FROM public.order_payments op USING public.orders o
         WHERE op.order_id = o.id AND o.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(
        `DELETE FROM public.invoice_items ii USING public.invoices inv
         WHERE ii.invoice_id = inv.id AND inv.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(`DELETE FROM public.invoices WHERE tenant_id = $1::uuid`, [tenantId]);
      await queryRunner.query(
        `DELETE FROM public.order_items oi USING public.orders o
         WHERE oi.order_id = o.id AND o.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(`DELETE FROM public.orders WHERE tenant_id = $1::uuid`, [tenantId]);
      await queryRunner.query(
        `DELETE FROM public.cart_items ci USING public.cart c
         WHERE ci.cart_id = c.id AND c.tenant_id = $1::uuid`,
        [tenantId],
      );
      await queryRunner.query(`DELETE FROM public.cart WHERE tenant_id = $1::uuid`, [tenantId]);

      await queryRunner.query(`UPDATE tenants SET tenant_schema_provisioned = true WHERE id = $1::uuid`, [tenantId]);
    }
  }

  private async repointTenantCommerceFks(queryRunner: QueryRunner, qSch: string): Promise<void> {
    const inv = `${qSch}."inventory"`;
    const ci = `${qSch}."cart_items"`;
    const oi = `${qSch}."order_items"`;
    const invc = `${qSch}."invoices"`;
    const iit = `${qSch}."invoice_items"`;
    const op = `${qSch}."order_payments"`;
    const p = `${qSch}."products"`;
    const pv = `${qSch}."product_variants"`;
    const ord = `${qSch}."orders"`;

    await queryRunner.query(`ALTER TABLE ${inv} DROP CONSTRAINT IF EXISTS "FK_inventory_product"`);
    await queryRunner.query(`ALTER TABLE ${inv} DROP CONSTRAINT IF EXISTS "FK_inventory_variant"`);
    await queryRunner.query(
      `ALTER TABLE ${inv} ADD CONSTRAINT "FK_inventory_product" FOREIGN KEY ("product_id") REFERENCES ${p}("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE ${inv} ADD CONSTRAINT "FK_inventory_variant" FOREIGN KEY ("variant_id") REFERENCES ${pv}("id") ON DELETE CASCADE`,
    );

    const c = `${qSch}."cart"`;
    await queryRunner.query(`ALTER TABLE ${ci} DROP CONSTRAINT IF EXISTS "FK_cart_items_cart"`);
    await queryRunner.query(`ALTER TABLE ${ci} DROP CONSTRAINT IF EXISTS "FK_cart_items_product"`);
    await queryRunner.query(`ALTER TABLE ${ci} DROP CONSTRAINT IF EXISTS "FK_cart_items_variant"`);
    await queryRunner.query(
      `ALTER TABLE ${ci} ADD CONSTRAINT "FK_cart_items_cart" FOREIGN KEY ("cart_id") REFERENCES ${c}("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE ${ci} ADD CONSTRAINT "FK_cart_items_product" FOREIGN KEY ("product_id") REFERENCES ${p}("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE ${ci} ADD CONSTRAINT "FK_cart_items_variant" FOREIGN KEY ("variant_id") REFERENCES ${pv}("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(`ALTER TABLE ${oi} DROP CONSTRAINT IF EXISTS "FK_order_items_order"`);
    await queryRunner.query(`ALTER TABLE ${oi} DROP CONSTRAINT IF EXISTS "FK_order_items_product"`);
    await queryRunner.query(`ALTER TABLE ${oi} DROP CONSTRAINT IF EXISTS "FK_order_items_variant"`);
    await queryRunner.query(
      `ALTER TABLE ${oi} ADD CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id") REFERENCES ${ord}("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE ${oi} ADD CONSTRAINT "FK_order_items_product" FOREIGN KEY ("product_id") REFERENCES ${p}("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE ${oi} ADD CONSTRAINT "FK_order_items_variant" FOREIGN KEY ("variant_id") REFERENCES ${pv}("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(`ALTER TABLE ${invc} DROP CONSTRAINT IF EXISTS "FK_invoices_order"`);
    await queryRunner.query(
      `ALTER TABLE ${invc} ADD CONSTRAINT "FK_invoices_order" FOREIGN KEY ("order_id") REFERENCES ${ord}("id") ON DELETE CASCADE`,
    );

    await queryRunner.query(`ALTER TABLE ${iit} DROP CONSTRAINT IF EXISTS "FK_invoice_items_invoice"`);
    await queryRunner.query(`ALTER TABLE ${iit} DROP CONSTRAINT IF EXISTS "FK_invoice_items_product"`);
    await queryRunner.query(`ALTER TABLE ${iit} DROP CONSTRAINT IF EXISTS "FK_invoice_items_variant"`);
    await queryRunner.query(
      `ALTER TABLE ${iit} ADD CONSTRAINT "FK_invoice_items_invoice" FOREIGN KEY ("invoice_id") REFERENCES ${invc}("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE ${iit} ADD CONSTRAINT "FK_invoice_items_product" FOREIGN KEY ("product_id") REFERENCES ${p}("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE ${iit} ADD CONSTRAINT "FK_invoice_items_variant" FOREIGN KEY ("variant_id") REFERENCES ${pv}("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(`ALTER TABLE ${op} DROP CONSTRAINT IF EXISTS "FK_order_payments_order"`);
    await queryRunner.query(
      `ALTER TABLE ${op} ADD CONSTRAINT "FK_order_payments_order" FOREIGN KEY ("order_id") REFERENCES ${ord}("id") ON DELETE CASCADE`,
    );
  }

  public async down(): Promise<void> {
    /** Irreversible without snapshot. */
  }
}
