import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { CartItem } from '../../common/entities/cart-item.entity';
import { Cart } from '../../common/entities/cart.entity';
import { Inventory } from '../../common/entities/inventory.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { Product } from '../../common/entities/product.entity';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { effectiveGstPercent } from '../../common/utils/tax-resolution.util';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly tenantRunner: TenantSchemaRunner) {}

  async getCart(user: JwtUserPayload) {
    const tenantId = this.requireTenantId(user);
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const cart = await this.getOrCreateUserCart(m, user);
      const items = await m.getRepository(CartItem).find({
        where: { cartId: cart.id, deletedAt: IsNull() },
        relations: { product: true, variant: true },
        order: { createdAt: 'ASC' },
      });
      return { success: true, data: { cart, items }, meta: {}, message: '' };
    });
  }

  async addItem(user: JwtUserPayload, dto: AddCartItemDto) {
    const tenantId = this.requireTenantId(user);
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const cart = await this.getOrCreateUserCart(m, user);
      const productsRepo = m.getRepository(Product);
      const variantsRepo = m.getRepository(ProductVariant);
      const cartItemRepo = m.getRepository(CartItem);

      const product = await productsRepo.findOne({ where: { id: dto.productId, deletedAt: IsNull() } });
      if (!product) throw new BadRequestException('Product not found.');
      this.ensureSameTenant(user, product.tenantId);

      let priceSnapshot = product.price;
      let variant: ProductVariant | null = null;
      if (dto.variantId) {
        variant = await variantsRepo.findOne({ where: { id: dto.variantId, deletedAt: IsNull() } });
        if (!variant) throw new BadRequestException('Variant not found.');
        priceSnapshot = variant.price;
      }

      const moq = variant?.moq ?? 1;
      this.assertMoq(dto.quantity, moq);

      await this.validateStock(m, dto.productId, dto.variantId ?? null, dto.quantity);

      const taxRate = effectiveGstPercent({
        variantGstRate: variant?.gstRate ?? null,
        productTaxRate: product.taxRate,
      });

      const existing = await cartItemRepo.findOne({
        where: { cartId: cart.id, productId: dto.productId, variantId: dto.variantId ?? IsNull(), deletedAt: IsNull() },
      });
      if (existing) {
        const nextQty = existing.quantity + dto.quantity;
        this.assertMoq(nextQty, moq);
        await this.validateStock(m, dto.productId, dto.variantId ?? null, nextQty);
        existing.quantity = nextQty;
        existing.priceSnapshot = priceSnapshot;
        existing.taxRate = taxRate;
        const saved = await cartItemRepo.save(existing);
        return { success: true, data: saved, meta: {}, message: '' };
      }

      const saved = await cartItemRepo.save(
        cartItemRepo.create({
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          quantity: dto.quantity,
          priceSnapshot,
          taxRate,
        }),
      );
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async updateItem(user: JwtUserPayload, itemId: string, dto: UpdateCartItemDto) {
    const tenantId = this.requireTenantId(user);
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const cartItemRepo = m.getRepository(CartItem);
      const cartRepo = m.getRepository(Cart);

      const item = await cartItemRepo.findOne({
        where: { id: itemId, deletedAt: IsNull() },
        relations: { product: true, variant: true },
      });
      if (!item) throw new BadRequestException('Cart item not found.');
      const cart = await cartRepo.findOne({ where: { id: item.cartId } });
      if (!cart) throw new BadRequestException('Cart not found.');
      this.ensureSameTenant(user, cart.tenantId);
      this.ensureSameUser(user, cart.userId);
      const moq = item.variant?.moq ?? 1;
      this.assertMoq(dto.quantity, moq);
      await this.validateStock(m, item.productId, item.variantId, dto.quantity);
      const product = item.product;
      if (!product) throw new BadRequestException('Product not found for cart item.');
      item.quantity = dto.quantity;
      item.taxRate = effectiveGstPercent({
        variantGstRate: item.variant?.gstRate ?? null,
        productTaxRate: product.taxRate,
      });
      const saved = await cartItemRepo.save(item);
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async removeItem(user: JwtUserPayload, itemId: string) {
    const tenantId = this.requireTenantId(user);
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const cartItemRepo = m.getRepository(CartItem);
      const cartRepo = m.getRepository(Cart);

      const item = await cartItemRepo.findOne({ where: { id: itemId, deletedAt: IsNull() } });
      if (!item) throw new BadRequestException('Cart item not found.');
      const cart = await cartRepo.findOne({ where: { id: item.cartId } });
      if (!cart) throw new BadRequestException('Cart not found.');
      this.ensureSameTenant(user, cart.tenantId);
      this.ensureSameUser(user, cart.userId);
      await cartItemRepo.softDelete({ id: itemId });
      return { success: true, data: { deleted: true }, meta: {}, message: '' };
    });
  }

  async clearCart(cartId: string, tenantId: string) {
    await this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      await m
        .getRepository(CartItem)
        .createQueryBuilder()
        .softDelete()
        .where('cart_id = :cartId', { cartId })
        .andWhere('deleted_at IS NULL')
        .execute();
    });
  }

  async getCartItemsForUser(user: JwtUserPayload): Promise<{ cart: Cart; items: CartItem[] }> {
    const tenantId = this.requireTenantId(user);
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const cart = await this.getOrCreateUserCart(m, user);
      const items = await m.getRepository(CartItem).find({ where: { cartId: cart.id, deletedAt: IsNull() } });
      return { cart, items };
    });
  }

  private requireTenantId(user: JwtUserPayload): string {
    if (!user.tenantId) throw new ForbiddenException('Tenant user required for cart.');
    return user.tenantId;
  }

  private async getOrCreateUserCart(m: import('typeorm').EntityManager, user: JwtUserPayload): Promise<Cart> {
    const cartRepo = m.getRepository(Cart);
    let cart = await cartRepo.findOne({ where: { tenantId: user.tenantId!, userId: user.sub } });
    if (!cart) {
      cart = await cartRepo.save(cartRepo.create({ tenantId: user.tenantId!, userId: user.sub }));
    }
    return cart;
  }

  private assertMoq(quantity: number, moq: number): void {
    const m = Number(moq);
    const min = Number.isFinite(m) && m >= 1 ? m : 1;
    if (quantity < min) {
      throw new BadRequestException(`Minimum order quantity for this item is ${min}.`);
    }
  }

  private async validateStock(
    m: import('typeorm').EntityManager,
    productId: string,
    variantId: string | null,
    quantity: number,
  ) {
    const row = await m.getRepository(Inventory).findOne({
      where: { productId, variantId: variantId ? variantId : IsNull() },
    });
    if (!row) throw new BadRequestException('Inventory not available.');
    const available = row.stockQuantity - (row.reservedStock ?? 0);
    if (quantity > available) {
      throw new BadRequestException('Requested quantity exceeds available stock.');
    }
  }

  private ensureSameTenant(user: JwtUserPayload, tenantId: string) {
    if (!user.tenantId || user.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }
  }

  private ensureSameUser(user: JwtUserPayload, userId: string) {
    if (user.sub !== userId) throw new ForbiddenException('Cannot access another user cart.');
  }
}
