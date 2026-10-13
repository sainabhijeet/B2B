import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull } from 'typeorm';
import { Repository } from 'typeorm';
import { GuestCartLine } from '../../common/entities/guest-cart-line.entity';
import { Inventory } from '../../common/entities/inventory.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductImage } from '../../common/entities/product-image.entity';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { AppConfigService } from '../app-config/app-config.service';
import { AddGuestCartItemDto } from './dto/add-guest-cart-item.dto';

@Injectable()
export class StorefrontGuestCartService {
  constructor(
    @InjectRepository(GuestCartLine)
    private readonly guestLines: Repository<GuestCartLine>,
    private readonly tenantRunner: TenantSchemaRunner,
    private readonly appConfig: AppConfigService,
  ) {}

  async list(tenantId: string, deviceId: string) {
    const normalized = this.normalizeDeviceId(deviceId);
    await this.appConfig.assertGuestCartEnabled(tenantId);
    const lines = await this.guestLines.find({
      where: { tenantId, deviceId: normalized },
      order: { createdAt: 'ASC' },
    });
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const productsRepo = m.getRepository(Product);
      const productIds = [...new Set(lines.map((line) => line.productId))];
      const [products, imageRows] = productIds.length
        ? await Promise.all([
            productsRepo.find({
              where: { id: In(productIds), deletedAt: IsNull() },
              select: ['id', 'name'],
            }),
            m.getRepository(ProductImage).find({
              where: { productId: In(productIds) },
              order: { isThumbnail: 'DESC', position: 'ASC' },
            }),
          ])
        : [[], []];
      const productsById = new Map(
        products.map((product) => [product.id, product]),
      );
      const thumbnails = new Map<string, string>();
      for (const image of imageRows) {
        if (!thumbnails.has(image.productId))
          thumbnails.set(image.productId, image.imageUrl);
      }
      const items = lines.map((line) => {
        const product = productsById.get(line.productId);
        return {
          id: line.id,
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          priceSnapshot: line.priceSnapshot,
          product: product
            ? {
                id: product.id,
                name: product.name,
                thumbnailUrl: thumbnails.get(line.productId) ?? null,
              }
            : { id: line.productId, name: 'Item', thumbnailUrl: null },
        };
      });
      return { success: true, data: { items }, meta: {}, message: '' };
    });
  }

  async addItem(tenantId: string, deviceId: string, dto: AddGuestCartItemDto) {
    const normalized = this.normalizeDeviceId(deviceId);
    await this.appConfig.assertGuestCartEnabled(tenantId);
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const productsRepo = m.getRepository(Product);
      const variantsRepo = m.getRepository(ProductVariant);
      const product = await productsRepo.findOne({
        where: { id: dto.productId, deletedAt: IsNull() },
      });
      if (!product || product.tenantId !== tenantId)
        throw new BadRequestException('Product not found.');
      let priceSnapshot = product.price;
      let variant: ProductVariant | null = null;
      if (dto.variantId) {
        variant = await variantsRepo.findOne({
          where: {
            id: dto.variantId,
            productId: product.id,
            deletedAt: IsNull(),
          },
        });
        if (!variant) throw new BadRequestException('Variant not found.');
        priceSnapshot = variant.price;
      }
      const moq = variant?.moq ?? 1;
      this.assertMoq(dto.quantity, moq);
      await this.validateStock(
        m,
        dto.productId,
        dto.variantId ?? null,
        dto.quantity,
      );

      const existing = await this.guestLines.findOne({
        where: dto.variantId
          ? {
              tenantId,
              deviceId: normalized,
              productId: dto.productId,
              variantId: dto.variantId,
            }
          : {
              tenantId,
              deviceId: normalized,
              productId: dto.productId,
              variantId: IsNull(),
            },
      });
      if (existing) {
        const nextQty = existing.quantity + dto.quantity;
        this.assertMoq(nextQty, moq);
        await this.validateStock(
          m,
          dto.productId,
          dto.variantId ?? null,
          nextQty,
        );
        existing.quantity = nextQty;
        existing.priceSnapshot = String(priceSnapshot);
        const saved = await this.guestLines.save(existing);
        return { success: true, data: saved, meta: {}, message: '' };
      }

      const saved = await this.guestLines.save(
        this.guestLines.create({
          tenantId,
          deviceId: normalized,
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          quantity: dto.quantity,
          priceSnapshot: String(priceSnapshot),
        }),
      );
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async removeItem(tenantId: string, deviceId: string, lineId: string) {
    const normalized = this.normalizeDeviceId(deviceId);
    await this.appConfig.assertGuestCartEnabled(tenantId);
    const line = await this.guestLines.findOne({
      where: { id: lineId, tenantId },
    });
    if (!line || line.deviceId !== normalized) {
      return { success: true, data: { deleted: false }, meta: {}, message: '' };
    }
    await this.guestLines.delete({ id: lineId });
    return { success: true, data: { deleted: true }, meta: {}, message: '' };
  }

  private normalizeDeviceId(deviceId: string): string {
    const d = deviceId?.trim() ?? '';
    if (d.length < 4 || d.length > 255) {
      throw new BadRequestException(
        'X-Device-Id header is required (4–255 chars).',
      );
    }
    return d;
  }

  private assertMoq(quantity: number, moq: number): void {
    const m = Number(moq);
    const min = Number.isFinite(m) && m >= 1 ? m : 1;
    if (quantity < min) {
      throw new BadRequestException(
        `Minimum order quantity for this item is ${min}.`,
      );
    }
  }

  private async validateStock(
    m: import('typeorm').EntityManager,
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<void> {
    const row = await m.getRepository(Inventory).findOne({
      where: { productId, variantId: variantId ? variantId : IsNull() },
    });
    if (!row) throw new BadRequestException('Inventory not available.');
    const available = row.stockQuantity - (row.reservedStock ?? 0);
    if (quantity > available) {
      throw new BadRequestException(
        'Requested quantity exceeds available stock.',
      );
    }
  }
}
