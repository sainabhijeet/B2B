import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerPrice } from '../../common/entities/customer-price.entity';
import { GroupPrice } from '../../common/entities/group-price.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { QuantityPrice } from '../../common/entities/quantity-price.entity';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';

export type ResolvedVariantPrice = {
  unitPrice: string;
  mrp: string;
  /** Before quantity tier. */
  baseSource: 'customer' | 'group' | 'default';
  quantityTierApplied: boolean;
};

type CacheEntry = { exp: number; value: ResolvedVariantPrice };

/** In-process cache; swap for Redis using key `price:${tenantId}:${customerId}:${variantId}:${qty}`. */
@Injectable()
export class VariantPricingService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 45_000;
  private readonly maxEntries = 5000;

  constructor(private readonly tenantRunner: TenantSchemaRunner) {}

  invalidateTenant(tenantId: string): void {
    const prefix = `${tenantId}|`;
    for (const k of this.cache.keys()) {
      if (k.startsWith(prefix)) this.cache.delete(k);
    }
  }

  /**
   * Priority: customer-specific → best (min) group price across memberships → variant default;
   * then optional quantity tier (absolute unit price for that min_qty ladder).
   */
  async resolveForVariant(
    variantId: string,
    ctx: { tenantId: string; customerId?: string | null; quantity?: number },
  ): Promise<ResolvedVariantPrice> {
    const qty = Math.max(1, Math.floor(ctx.quantity ?? 1));
    const custKey = ctx.customerId ?? '-';
    const cacheKey = `${ctx.tenantId}|${custKey}|${variantId}|${qty}`;
    const now = Date.now();
    const hit = this.cache.get(cacheKey);
    if (hit && hit.exp > now) return hit.value;

    const value = await this.tenantRunner.withTenantCatalog(ctx.tenantId, async (m) => {
      const variantsRepo = m.getRepository(ProductVariant);
      const customerPricesRepo = m.getRepository(CustomerPrice);
      const groupPricesRepo = m.getRepository(GroupPrice);
      const quantityPricesRepo = m.getRepository(QuantityPrice);
      const customersRepo = m.getRepository(Customer);

      const variant = await variantsRepo.findOne({
        where: { id: variantId },
        relations: { product: true },
      });
      if (!variant?.product || variant.product.tenantId !== ctx.tenantId) {
        throw new NotFoundException('Variant not found.');
      }

      let basePrice = variant.price;
      let baseSource: ResolvedVariantPrice['baseSource'] = 'default';

      if (ctx.customerId) {
        const customer = await customersRepo.findOne({
          where: { id: ctx.customerId },
        });
        if (customer && customer.tenantId === ctx.tenantId) {
          const cp = await customerPricesRepo.findOne({
            where: { customerId: ctx.customerId, productVariantId: variantId },
          });
          if (cp) {
            basePrice = cp.price;
            baseSource = 'customer';
          } else {
            const row = await groupPricesRepo
              .createQueryBuilder('gp')
              .innerJoin('customer_group_map', 'cgm', 'cgm.group_id = gp.group_id')
              .innerJoin('customer_groups', 'cg', 'cg.id = gp.group_id AND cg.deleted_at IS NULL')
              .where('cgm.customer_id = :cid', { cid: ctx.customerId })
              .andWhere('gp.product_variant_id = :vid', { vid: variantId })
              .select('MIN(gp.price)', 'minp')
              .getRawOne<{ minp: string | null }>();
            if (row?.minp != null && row.minp !== '') {
              basePrice = row.minp;
              baseSource = 'group';
            }
          }
        }
      }

      const tier = await quantityPricesRepo
        .createQueryBuilder('q')
        .where('q.product_variant_id = :vid', { vid: variantId })
        .andWhere('q.min_qty <= :qty', { qty })
        .orderBy('q.min_qty', 'DESC')
        .getOne();

      const quantityTierApplied = !!tier;
      const unitPrice = quantityTierApplied ? tier!.price : basePrice;

      return {
        unitPrice,
        mrp: variant.mrp,
        baseSource,
        quantityTierApplied,
      } satisfies ResolvedVariantPrice;
    });

    this.evictIfNeeded();
    this.cache.set(cacheKey, { exp: now + this.ttlMs, value });
    return value;
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxEntries) return;
    const drop = Math.ceil(this.maxEntries * 0.1);
    let i = 0;
    for (const k of this.cache.keys()) {
      this.cache.delete(k);
      if (++i >= drop) break;
    }
  }
}
