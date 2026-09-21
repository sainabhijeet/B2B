import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from '../common/entities/tenant.entity';

export function computeTenantSchemaName(tenantId: string): string {
  return `t_${tenantId.replace(/-/g, '')}`;
}

@Injectable()
export class TenantSchemaService {
  private readonly logger = new Logger(TenantSchemaService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly config: ConfigService,
  ) {}

  private get autoProvision(): boolean {
    return this.config.get<boolean>('tenantSchema.autoProvision', true);
  }

  /**
   * Ensures `tenants.schema_name` is set and (when enabled) creates the Postgres schema
   * and bootstrap metadata table. Does not throw on DDL failure — logs and leaves
   * `tenant_schema_provisioned` false so an admin can retry.
   */
  async provisionAfterTenantCreate(tenant: Tenant): Promise<void> {
    const schemaName = computeTenantSchemaName(tenant.id);
    if (tenant.schemaName !== schemaName) {
      await this.tenantRepository.update({ id: tenant.id }, { schemaName });
    }

    if (!this.autoProvision) {
      this.logger.log(`Tenant ${tenant.id}: schema DDL skipped (TENANT_SCHEMA_AUTO_PROVISION=false).`);
      return;
    }

    try {
      await this.ensureSchemaAndMeta(schemaName);
      await this.tenantRepository.update({ id: tenant.id }, { tenantSchemaProvisioned: true });
    } catch (err) {
      this.logger.error(
        `Tenant ${tenant.id}: failed to provision schema ${schemaName}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /** Idempotent: creates schema + meta table and marks tenant provisioned. */
  async provisionByTenantId(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }
    const schemaName = computeTenantSchemaName(tenant.id);
    await this.tenantRepository.update({ id: tenant.id }, { schemaName });
    await this.ensureSchemaAndMeta(schemaName);
    await this.tenantRepository.update({ id: tenant.id }, { tenantSchemaProvisioned: true });
    const updated = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!updated) throw new NotFoundException('Tenant not found after provision.');
    return updated;
  }

  private quoteIdent(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  }

  private async ensureSchemaAndMeta(schemaName: string): Promise<void> {
    if (!/^t_[a-f0-9]{32}$/.test(schemaName)) {
      throw new Error('Invalid tenant schema name.');
    }
    const qSchema = this.quoteIdent(schemaName);
    await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS ${qSchema}`);

    await this.dataSource.query(
      `CREATE TABLE IF NOT EXISTS ${qSchema}._tenant_schema_meta (
        id integer PRIMARY KEY DEFAULT 1,
        schema_version integer NOT NULL DEFAULT 1,
        migrated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT _tenant_schema_meta_single CHECK (id = 1)
      )`,
    );
    await this.dataSource.query(
      `INSERT INTO ${qSchema}._tenant_schema_meta (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
    );

    await this.ensureBusinessTablesLikePublic(schemaName);
  }

  /**
   * Mirrors core catalog + B2B pricing tables from `public` into the tenant schema
   * (empty shells for new tenants; bulk copy is handled by DB migration).
   */
  private async ensureBusinessTablesLikePublic(schemaName: string): Promise<void> {
    const qSchema = this.quoteIdent(schemaName);
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
    for (const tbl of tables) {
      const qt = this.quoteIdent(tbl);
      await this.dataSource.query(
        `CREATE TABLE IF NOT EXISTS ${qSchema}.${qt} (LIKE public.${qt} INCLUDING ALL)`,
      );
    }
    await this.dataSource.query(`ALTER TABLE ${qSchema}."order_requests" DROP CONSTRAINT IF EXISTS "FK_order_requests_distributor"`);
    await this.dataSource.query(`ALTER TABLE ${qSchema}."order_requests" ADD CONSTRAINT "FK_order_requests_distributor" FOREIGN KEY ("distributor_id") REFERENCES public."tenants"("id") ON DELETE CASCADE`);
    await this.dataSource.query(`ALTER TABLE ${qSchema}."replacement_shipments" DROP CONSTRAINT IF EXISTS "FK_replacement_shipments_tenant", DROP CONSTRAINT IF EXISTS "FK_replacement_shipments_order", DROP CONSTRAINT IF EXISTS "FK_replacement_shipments_request", DROP CONSTRAINT IF EXISTS "FK_replacement_shipments_created_by"`);
    await this.dataSource.query(`ALTER TABLE ${qSchema}."replacement_shipments" ADD CONSTRAINT "FK_replacement_shipments_tenant" FOREIGN KEY ("tenant_id") REFERENCES public."tenants"("id") ON DELETE CASCADE, ADD CONSTRAINT "FK_replacement_shipments_order" FOREIGN KEY ("order_id") REFERENCES ${qSchema}."orders"("id") ON DELETE CASCADE, ADD CONSTRAINT "FK_replacement_shipments_request" FOREIGN KEY ("request_id") REFERENCES ${qSchema}."order_requests"("id") ON DELETE CASCADE, ADD CONSTRAINT "FK_replacement_shipments_created_by" FOREIGN KEY ("created_by") REFERENCES public."users"("id") ON DELETE RESTRICT`);

    await this.dataSource.query(`
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
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS "idx_top_products_tenant_position"
      ON ${qSchema}."top_products" ("tenant_id", "position" ASC, "created_at" ASC)
    `);
  }
}
