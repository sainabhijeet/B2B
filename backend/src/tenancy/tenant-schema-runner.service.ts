import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { Tenant } from '../common/entities/tenant.entity';

/**
 * Runs catalog / tenant business queries on a single pooled connection with
 * `SET search_path TO "<tenant_schema>", public` so unqualified table names
 * resolve to the tenant schema first (products, variants, pricing, …) and
 * platform tables (categories, tenants, …) fall back to `public`.
 *
 * `customers` / `customer_addresses` stay in `public` (FK from `users.customer_id`).
 */
@Injectable()
export class TenantSchemaRunner {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private quoteIdent(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  }

  /**
   * @param tenantId When null, runs on default `public` only (platform-wide ops).
   */
  async withTenantCatalog<T>(
    tenantId: string | null | undefined,
    work: (m: EntityManager) => Promise<T>,
  ): Promise<T> {
    if (!tenantId) {
      return work(this.ds.manager);
    }
    const t = await this.ds.getRepository(Tenant).findOne({
      where: { id: tenantId },
      select: ['id', 'schemaName', 'tenantSchemaProvisioned'],
    });
    if (!t?.schemaName || !t.tenantSchemaProvisioned) {
      throw new BadRequestException(
        'Tenant Postgres schema is not provisioned for this tenant. Run tenant schema provisioning / migration first.',
      );
    }
    if (!/^t_[a-f0-9]{32}$/.test(t.schemaName)) {
      throw new BadRequestException('Invalid tenant schema name.');
    }
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    try {
      await this.ensureTenantSchemaCompatibility(qr.manager, t.schemaName);
      await qr.query(
        `SET search_path TO ${this.quoteIdent(t.schemaName)}, public`,
      );
      return await work(qr.manager);
    } finally {
      await qr.query(`SET search_path TO public`);
      await qr.release();
    }
  }

  private async ensureTenantSchemaCompatibility(
    m: EntityManager,
    schemaName: string,
  ): Promise<void> {
    const qSch = this.quoteIdent(schemaName);
    await m.query(`
      ALTER TABLE ${qSch}."products"
      ADD COLUMN IF NOT EXISTS "meta_title" varchar(255),
      ADD COLUMN IF NOT EXISTS "meta_description" text,
      ADD COLUMN IF NOT EXISTS "meta_keywords" varchar(512),
      ADD COLUMN IF NOT EXISTS "cost_price" numeric(12,2),
      ADD COLUMN IF NOT EXISTS "tags" jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "brand_id" uuid,
      ADD COLUMN IF NOT EXISTS "brand" varchar(255),
      ADD COLUMN IF NOT EXISTS "weight" numeric(12,3),
      ADD COLUMN IF NOT EXISTS "dimensions" varchar(255),
      ADD COLUMN IF NOT EXISTS "hsn_code" varchar(32),
      ADD COLUMN IF NOT EXISTS "barcode" varchar(64)
    `);
    await m.query(`
      ALTER TABLE ${qSch}."inventory"
      ADD COLUMN IF NOT EXISTS "reserved_stock" integer NOT NULL DEFAULT 0
    `);
    await m.query(`
      ALTER TABLE ${qSch}."orders"
      ADD COLUMN IF NOT EXISTS "shipping_address_id" uuid,
      ADD COLUMN IF NOT EXISTS "payment_mode" varchar(32) NOT NULL DEFAULT 'CREDIT',
      ADD COLUMN IF NOT EXISTS "order_source" varchar(32) NOT NULL DEFAULT 'STOREFRONT'
    `);
    await m.query(`
      ALTER TABLE ${qSch}."order_items"
      ADD COLUMN IF NOT EXISTS "variant_sku" varchar(128)
    `);
    await m.query(`
      ALTER TABLE ${qSch}."order_payments"
      ADD COLUMN IF NOT EXISTS "razorpay_order_id" varchar(64),
      ADD COLUMN IF NOT EXISTS "razorpay_payment_id" varchar(64),
      ADD COLUMN IF NOT EXISTS "razorpay_refund_id" varchar(64),
      ADD COLUMN IF NOT EXISTS "refunded_at" timestamptz
    `);
    await m.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_payments_razorpay_order_unique"
      ON ${qSch}."order_payments" ("razorpay_order_id")
      WHERE "razorpay_order_id" IS NOT NULL
    `);
    await m.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_payments_razorpay_payment_unique"
      ON ${qSch}."order_payments" ("razorpay_payment_id")
      WHERE "razorpay_payment_id" IS NOT NULL
    `);
    await m.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_order_payments_razorpay_refund_id"
      ON ${qSch}."order_payments" ("razorpay_refund_id")
      WHERE "razorpay_refund_id" IS NOT NULL
    `);
  }
}
