import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductImage } from '../../common/entities/product-image.entity';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantAccessGuard } from '../../common/guards/tenant-access.guard';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';

type WishlistState = { productIds: string[] };
type RfqState = { rows: Record<string, unknown>[] };
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
@ApiTags('Mobile commerce')
@ApiBearerAuth('bearer')
export class MobileCommerceController {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    private readonly tenantRunner: TenantSchemaRunner,
  ) {}

  @Get('wishlist')
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async wishlist(@CurrentUser() user: JwtUserPayload) {
    const state = await this.readWishlist(user);
    const tenantId = user.tenantId;
    const validProductIds = state.productIds.filter((id) =>
      UUID_PATTERN.test(id),
    );
    if (!tenantId || validProductIds.length === 0) {
      return {
        success: true,
        data: { ...state, items: [] },
        meta: {},
        message: '',
      };
    }
    const items = await this.tenantRunner.withTenantCatalog(
      tenantId,
      async (manager) => {
        const products = await manager.getRepository(Product).find({
          where: {
            id: In(validProductIds),
            tenantId,
            deletedAt: IsNull(),
            status: 'active',
          },
          select: ['id', 'name', 'slug', 'sku', 'brand'],
        });
        const productIds = products.map((product) => product.id);
        if (!productIds.length) return [];
        const images = await manager.getRepository(ProductImage).find({
          where: { productId: In(productIds) },
          order: { isThumbnail: 'DESC', position: 'ASC' },
        });
        const imagesByProduct = new Map<string, string>();
        for (const image of images) {
          if (!imagesByProduct.has(image.productId)) {
            imagesByProduct.set(image.productId, image.imageUrl);
          }
        }
        const byId = new Map(products.map((product) => [product.id, product]));
        return state.productIds.flatMap((id) => {
          const product = byId.get(id);
          return product
            ? [
                {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  sku: product.sku,
                  brand: product.brand,
                  thumbnailUrl: imagesByProduct.get(id) ?? null,
                },
              ]
            : [];
        });
      },
    );
    return { success: true, data: { ...state, items }, meta: {}, message: '' };
  }

  @Post('wishlist/items')
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async addWishlistItem(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: { productId?: string },
  ) {
    const productId = (dto.productId ?? '').trim();
    const tenantId = user.tenantId;
    if (!UUID_PATTERN.test(productId) || !tenantId) {
      throw new BadRequestException(
        'Valid product ID and tenant are required.',
      );
    }
    const exists = await this.tenantRunner.withTenantCatalog(
      tenantId,
      (manager) =>
        manager.getRepository(Product).exists({
          where: {
            id: productId,
            tenantId,
            deletedAt: IsNull(),
            status: 'active',
          },
        }),
    );
    if (!exists)
      throw new NotFoundException('Product not found in this store.');
    const state = await this.readWishlist(user);
    if (!state.productIds.includes(productId)) {
      state.productIds = [productId, ...state.productIds];
      await this.saveWishlist(user, state);
    }
    return { success: true, data: state, meta: {}, message: '' };
  }

  @Delete('wishlist/items/:productId')
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async removeWishlistItem(
    @CurrentUser() user: JwtUserPayload,
    @Param('productId') productId: string,
  ) {
    const state = await this.readWishlist(user);
    state.productIds = state.productIds.filter((id) => id !== productId);
    await this.saveWishlist(user, state);
    return { success: true, data: state, meta: {}, message: '' };
  }

  @Get('rfqs')
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async rfqs(@CurrentUser() user: JwtUserPayload) {
    const state = await this.readRfqs(user);
    return { success: true, data: state.rows, meta: {}, message: '' };
  }

  @Post('rfqs')
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  async createRfq(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: Record<string, unknown>,
  ) {
    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      customerId: user.customerId ?? user.sub,
      productId: String(dto.productId ?? ''),
      productName: String(dto.productName ?? dto.name ?? 'Product'),
      quantity: Number(dto.quantity ?? 1),
      targetPrice: dto.targetPrice ?? null,
      message: dto.message ?? null,
      status: 'REQUESTED',
      createdAt: now,
    };
    const state = await this.readRfqs(user);
    state.rows = [row, ...state.rows];
    await this.saveRfqs(user, state);
    return {
      success: true,
      data: row,
      meta: {},
      message: 'RFQ submitted.',
    };
  }

  @Get('quotations')
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  quotations() {
    return { success: true, data: [], meta: {}, message: '' };
  }

  @Post('quotations/:id/approve')
  @Roles(UserRole.CUSTOMER, UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  approveQuotation(@Param('id') id: string) {
    return {
      success: true,
      data: { id, status: 'APPROVED', approvedAt: new Date().toISOString() },
      meta: {},
      message: 'Quotation approved.',
    };
  }

  private wishlistKey(user: JwtUserPayload) {
    return `wishlist:${user.tenantId ?? 'platform'}:${user.sub}`;
  }

  private rfqKey(user: JwtUserPayload) {
    return `rfqs:${user.tenantId ?? 'platform'}:${user.sub}`;
  }

  private async readWishlist(user: JwtUserPayload): Promise<WishlistState> {
    const row = await this.configRepo.findOne({
      where: { key: this.wishlistKey(user) },
    });
    if (!row?.value) return { productIds: [] };
    try {
      const parsed = JSON.parse(row.value) as Partial<WishlistState>;
      return {
        productIds: Array.isArray(parsed.productIds)
          ? parsed.productIds.map(String).filter(Boolean)
          : [],
      };
    } catch {
      return { productIds: [] };
    }
  }

  private async saveWishlist(user: JwtUserPayload, state: WishlistState) {
    await this.configRepo.save(
      this.configRepo.create({
        key: this.wishlistKey(user),
        value: JSON.stringify(state),
      }),
    );
  }

  private async readRfqs(user: JwtUserPayload): Promise<RfqState> {
    const row = await this.configRepo.findOne({
      where: { key: this.rfqKey(user) },
    });
    if (!row?.value) return { rows: [] };
    try {
      const parsed = JSON.parse(row.value) as Partial<RfqState>;
      return { rows: Array.isArray(parsed.rows) ? parsed.rows : [] };
    } catch {
      return { rows: [] };
    }
  }

  private async saveRfqs(user: JwtUserPayload, state: RfqState) {
    await this.configRepo.save(
      this.configRepo.create({
        key: this.rfqKey(user),
        value: JSON.stringify(state),
      }),
    );
  }
}
