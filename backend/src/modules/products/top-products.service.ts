import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import { Inventory } from '../../common/entities/inventory.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { TopProduct } from '../../common/entities/top-product.entity';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { CreateTopProductDto } from './dto/create-top-product.dto';
import { UpdateTopProductDto } from './dto/update-top-product.dto';

@Injectable()
export class TopProductsService {
  constructor(private readonly tenantRunner: TenantSchemaRunner) {}

  private requireTenantId(user: JwtUserPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant context required.');
    return user.tenantId;
  }

  /** Curated rows + variant/product labels (distributor panel + API). */
  async list(user: JwtUserPayload) {
    const tid = this.requireTenantId(user);
    return this.tenantRunner.withTenantCatalog(tid, async (m) => {
      const rows = await m.getRepository(TopProduct).find({
        where: { tenantId: tid },
        order: { position: 'ASC', createdAt: 'ASC' },
        relations: { variant: { product: true } },
      });
      const data = rows.map((r) => ({
        id: r.id,
        variantId: r.variantId,
        position: r.position,
        isActive: r.isActive,
        createdAt: r.createdAt,
        productName: r.variant?.product?.name ?? null,
        variantSku: r.variant?.variantSku ?? null,
        price: r.variant?.price ?? null,
      }));
      return { success: true, data, meta: {}, message: '' };
    });
  }

  async create(user: JwtUserPayload, dto: CreateTopProductDto) {
    const tid = this.requireTenantId(user);
    return this.tenantRunner.withTenantCatalog(tid, async (m) => {
      const tpRepo = m.getRepository(TopProduct);
      const vRepo = m.getRepository(ProductVariant);
      const pRepo = m.getRepository(Product);

      const v = await vRepo.findOne({ where: { id: dto.variantId, deletedAt: IsNull() } });
      if (!v) throw new BadRequestException('Variant not found.');
      if (v.status !== 'active') throw new BadRequestException('Variant must be active.');
      const product = await pRepo.findOne({ where: { id: v.productId, deletedAt: IsNull() } });
      if (!product || product.tenantId !== tid) {
        throw new ForbiddenException('Variant does not belong to this tenant.');
      }

      const dup = await tpRepo.findOne({ where: { tenantId: tid, variantId: dto.variantId } });
      if (dup) throw new ConflictException('This variant is already in top products.');

      let position = dto.position;
      if (position === undefined || position === null) {
        const raw = await tpRepo
          .createQueryBuilder('tp')
          .select('MAX(tp.position)', 'max')
          .where('tp.tenant_id = :tid', { tid })
          .getRawOne<{ max: string | null }>();
        position = (raw?.max != null ? Number(raw.max) : -1) + 1;
      }

      const row = await tpRepo.save(
        tpRepo.create({
          tenantId: tid,
          variantId: dto.variantId,
          position,
          isActive: dto.isActive ?? true,
        }),
      );
      return { success: true, data: row, meta: {}, message: '' };
    });
  }

  async update(user: JwtUserPayload, id: string, dto: UpdateTopProductDto) {
    const tid = this.requireTenantId(user);
    if (dto.position === undefined && dto.isActive === undefined) {
      throw new BadRequestException('Provide position and/or isActive.');
    }
    return this.tenantRunner.withTenantCatalog(tid, async (m) => {
      const tpRepo = m.getRepository(TopProduct);
      const row = await tpRepo.findOne({ where: { id, tenantId: tid } });
      if (!row) throw new NotFoundException('Top product row not found.');
      if (dto.position !== undefined) row.position = dto.position;
      if (dto.isActive !== undefined) row.isActive = dto.isActive;
      await tpRepo.save(row);
      return { success: true, data: row, meta: {}, message: '' };
    });
  }

  async remove(user: JwtUserPayload, id: string) {
    const tid = this.requireTenantId(user);
    return this.tenantRunner.withTenantCatalog(tid, async (m) => {
      const tpRepo = m.getRepository(TopProduct);
      const res = await tpRepo.delete({ id, tenantId: tid });
      if (!res.affected) throw new NotFoundException('Top product row not found.');
      return { success: true, data: { id }, meta: {}, message: '' };
    });
  }

  /**
   * WhatsApp / quick order: curated slots that still have active variant + stock,
   * otherwise heuristic fallback so the list is never empty when catalog has stock.
   */
  async listForWhatsappFlow(tenantId: string, limit: number): Promise<{ lines: string[]; variantIds: string[] }> {
    const curated = await this.listCuratedInStock(tenantId, limit);
    if (curated.variantIds.length > 0) return curated;
    return this.listFallbackInStock(tenantId, limit);
  }

  private async listCuratedInStock(
    tenantId: string,
    limit: number,
  ): Promise<{ lines: string[]; variantIds: string[] }> {
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const tpRepo = m.getRepository(TopProduct);
      const vRepo = m.getRepository(ProductVariant);
      const pRepo = m.getRepository(Product);
      const invRepo = m.getRepository(Inventory);

      const slots = await tpRepo.find({
        where: { tenantId, isActive: true },
        order: { position: 'ASC', createdAt: 'ASC' },
        take: Math.max(limit * 4, 20),
      });

      const lines: string[] = [];
      const variantIds: string[] = [];

      for (const s of slots) {
        if (lines.length >= limit) break;
        const v = await vRepo.findOne({
          where: { id: s.variantId, deletedAt: IsNull(), status: 'active' },
        });
        if (!v) continue;
        const p = await pRepo.findOne({
          where: { id: v.productId, deletedAt: IsNull(), status: 'active' },
        });
        if (!p || p.tenantId !== tenantId) continue;
        const inv = await invRepo.findOne({
          where: { productId: p.id, variantId: v.id },
        });
        const avail = (inv?.stockQuantity ?? 0) - (inv?.reservedStock ?? 0);
        if (avail <= 0) continue;
        const price = Number(v.price);
        lines.push(
          `${lines.length + 1}. ${p.name} — ${v.variantSku} — ₹${Number.isFinite(price) ? price : v.price}`,
        );
        variantIds.push(v.id);
      }

      return { lines, variantIds };
    });
  }

  private async listFallbackInStock(
    tenantId: string,
    limit: number,
  ): Promise<{ lines: string[]; variantIds: string[] }> {
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const productsRepo = m.getRepository(Product);
      const variantsRepo = m.getRepository(ProductVariant);
      const invRepo = m.getRepository(Inventory);

      const candidates = await productsRepo.find({
        where: { tenantId, deletedAt: IsNull(), status: 'active' },
        order: { updatedAt: 'DESC' },
        take: 40,
      });

      const lines: string[] = [];
      const variantIds: string[] = [];

      for (const p of candidates) {
        if (lines.length >= limit) break;
        const variants = await variantsRepo.find({
          where: { productId: p.id, deletedAt: IsNull(), status: 'active' },
          order: { createdAt: 'ASC' },
        });
        for (const v of variants) {
          if (lines.length >= limit) break;
          const inv = await invRepo.findOne({
            where: { productId: p.id, variantId: v.id },
          });
          const avail = (inv?.stockQuantity ?? 0) - (inv?.reservedStock ?? 0);
          if (avail <= 0) continue;
          const price = Number(v.price);
          lines.push(
            `${lines.length + 1}. ${p.name} — ${v.variantSku} — ₹${Number.isFinite(price) ? price : v.price}`,
          );
          variantIds.push(v.id);
          break;
        }
      }

      return { lines, variantIds };
    });
  }
}
