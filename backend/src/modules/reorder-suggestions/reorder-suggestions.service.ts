import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Customer } from '../../common/entities/customer.entity';
import { Inventory } from '../../common/entities/inventory.entity';
import { OrderItem } from '../../common/entities/order-item.entity';
import { Order } from '../../common/entities/order.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { Product } from '../../common/entities/product.entity';
import { User } from '../../common/entities/user.entity';
import { PLATFORM_ROLES, UserRole } from '../../common/enums/user-role.enum';
import type { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import type { ReorderSuggestionDto, TenantReorderSuggestionsAnalyticsDto } from './dto/reorder-suggestion.dto';

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUtcDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function daysBetween(a: Date, b: Date): number {
  const ms = startOfUtcDay(b).getTime() - startOfUtcDay(a).getTime();
  return Math.round(ms / 86_400_000);
}

function medianRoundedDays(gaps: number[]): number {
  const g = gaps.filter((x) => Number.isFinite(x) && x >= 0).sort((a, b) => a - b);
  if (g.length === 0) return 1;
  const mid = Math.floor(g.length / 2);
  const raw = g.length % 2 ? g[mid]! : (g[mid - 1]! + g[mid]!) / 2;
  return Math.max(1, Math.round(raw));
}

@Injectable()
export class ReorderSuggestionsService {
  constructor(
    private readonly config: ConfigService,
    private readonly tenantRunner: TenantSchemaRunner,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Customer) private readonly customersRepo: Repository<Customer>,
  ) {}

  /**
   * Pattern: last 25 orders → per-variant purchase dates; median gap between buys;
   * due when `last_ordered + interval <= today` (UTC calendar days).
   * Single historical buy uses `reorder.defaultIntervalDays` as interval.
   */
  async computeSuggestions(tenantId: string, customerId: string): Promise<ReorderSuggestionDto[]> {
    const user = await this.usersRepo.findOne({
      where: { tenantId, customerId, deletedAt: IsNull() },
    });
    if (!user) return [];

    const defaultInterval = Math.max(
      1,
      this.config.get<number>('reorder.defaultIntervalDays', 7),
    );
    const maxLookbackDays = Math.max(
      7,
      this.config.get<number>('reorder.maxLookbackDays', 120),
    );
    const maxOrders = Math.max(5, this.config.get<number>('reorder.maxOrdersSample', 25));

    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const ordersRepo = m.getRepository(Order);
      const itemsRepo = m.getRepository(OrderItem);
      const variantsRepo = m.getRepository(ProductVariant);
      const productsRepo = m.getRepository(Product);
      const invRepo = m.getRepository(Inventory);

      const orders = await ordersRepo.find({
        where: { tenantId, userId: user.id, deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
        take: maxOrders,
      });
      if (orders.length === 0) return [];

      const orderIds = orders.map((o) => o.id);
      const items = await itemsRepo.find({
        where: { orderId: In(orderIds) },
        relations: ['product', 'variant'],
      });
      const itemsByOrder = new Map<string, OrderItem[]>();
      for (const it of items) {
        const arr = itemsByOrder.get(it.orderId) ?? [];
        arr.push(it);
        itemsByOrder.set(it.orderId, arr);
      }

      const variantEvents = new Map<string, { at: Date; qty: number }[]>();
      const chronologicalOrders = [...orders].reverse();
      for (const ord of chronologicalOrders) {
        const lines = itemsByOrder.get(ord.id) ?? [];
        const byVar = new Map<string, number>();
        for (const li of lines) {
          if (!li.variantId) continue;
          byVar.set(li.variantId, (byVar.get(li.variantId) ?? 0) + li.quantity);
        }
        for (const [variantId, qty] of byVar) {
          const ev = variantEvents.get(variantId) ?? [];
          ev.push({ at: ord.createdAt, qty });
          variantEvents.set(variantId, ev);
        }
      }

      const now = new Date();
      const lookbackCut = addUtcDays(startOfUtcDay(now), -maxLookbackDays);
      const out: ReorderSuggestionDto[] = [];

      for (const [variantId, events] of variantEvents) {
        const recent = events.filter((e) => startOfUtcDay(e.at) >= lookbackCut);
        if (recent.length === 0) continue;

        const last = recent[recent.length - 1]!;
        const lastQty = last.qty;

        let intervalDays: number;
        let confidence: 'pattern' | 'default';
        if (recent.length >= 2) {
          const gaps: number[] = [];
          for (let i = 1; i < recent.length; i++) {
            gaps.push(daysBetween(recent[i - 1]!.at, recent[i]!.at));
          }
          intervalDays = medianRoundedDays(gaps);
          confidence = 'pattern';
        } else {
          intervalDays = defaultInterval;
          confidence = 'default';
        }

        const nextDue = addUtcDays(startOfUtcDay(last.at), intervalDays);
        if (startOfUtcDay(now) < nextDue) continue;

        const v = await variantsRepo.findOne({ where: { id: variantId, deletedAt: IsNull() } });
        if (!v || v.status !== 'active') continue;
        const product = await productsRepo.findOne({
          where: { id: v.productId, deletedAt: IsNull() },
        });
        if (!product || product.status !== 'active') continue;

        const inv = await invRepo.findOne({
          where: { productId: product.id, variantId: v.id },
        });
        const stockAvailable = Math.max(0, (inv?.stockQuantity ?? 0) - (inv?.reservedStock ?? 0));

        const moq = v.moq ?? 1;
        const suggestedQty = Math.max(lastQty, moq);

        out.push({
          variantId,
          name: `${product.name} (${v.variantSku})`,
          lastQty,
          suggestedQty,
          intervalDays,
          lastOrderedAt: last.at.toISOString(),
          nextDueAt: nextDue.toISOString(),
          confidence,
          stockAvailable,
        });
      }

      return out.sort((a, b) => a.nextDueAt.localeCompare(b.nextDueAt));
    });
  }

  async getSuggestionsForCustomerResponse(
    actor: JwtUserPayload,
    customerId: string,
  ): Promise<{ success: true; data: ReorderSuggestionDto[]; meta: Record<string, never>; message: string }> {
    const c = await this.customersRepo.findOne({ where: { id: customerId, deletedAt: IsNull() } });
    if (!c) throw new NotFoundException('Customer not found.');

    if (actor.role === UserRole.CUSTOMER) {
      if (!actor.customerId || actor.customerId !== customerId) {
        throw new ForbiddenException('You can only view your own reorder suggestions.');
      }
      if (!actor.tenantId || actor.tenantId !== c.tenantId) {
        throw new ForbiddenException('Access denied.');
      }
    } else {
      if (!PLATFORM_ROLES.includes(actor.role)) {
        if (!actor.tenantId || actor.tenantId !== c.tenantId) {
          throw new ForbiddenException('Access denied.');
        }
      }
    }

    const data = await this.computeSuggestions(c.tenantId, customerId);
    return { success: true, data, meta: {}, message: '' };
  }

  async listTenantReorderSuggestionsAnalytics(
    tenantId: string,
  ): Promise<TenantReorderSuggestionsAnalyticsDto> {
    const take = Math.min(
      500,
      Math.max(10, this.config.get<number>('reorder.analyticsCustomerLimit', 300)),
    );
    const customers = await this.customersRepo.find({
      where: { tenantId, deletedAt: IsNull() },
      select: ['id', 'name'],
      order: { name: 'ASC' },
      take,
    });

    const rows: TenantReorderSuggestionsAnalyticsDto['customers'] = [];
    for (const c of customers) {
      const hasUser = await this.usersRepo.exist({
        where: { tenantId, customerId: c.id, deletedAt: IsNull() },
      });
      if (!hasUser) continue;

      const suggestions = await this.computeSuggestions(tenantId, c.id);
      if (suggestions.length === 0) continue;
      rows.push({
        customerId: c.id,
        customerName: c.name,
        suggestionCount: suggestions.length,
        suggestions,
      });
    }

    return { customers: rows, totalCustomersWithSuggestions: rows.length };
  }
}
