import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';
import { CustomerGroupMap } from '../../common/entities/customer-group-map.entity';
import { CustomerGroup } from '../../common/entities/customer-group.entity';
import { CustomerPrice } from '../../common/entities/customer-price.entity';
import { Customer } from '../../common/entities/customer.entity';
import { GroupPrice } from '../../common/entities/group-price.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { Product } from '../../common/entities/product.entity';
import { QuantityPrice } from '../../common/entities/quantity-price.entity';
import { PLATFORM_ROLES, UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { VariantPricingService } from './variant-pricing.service';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { CreateCustomerGroupDto } from './dto/create-customer-group.dto';
import { UpdateCustomerGroupDto } from './dto/update-customer-group.dto';
import { UpsertCustomerPriceDto } from './dto/upsert-customer-price.dto';
import { UpsertGroupPriceDto } from './dto/upsert-group-price.dto';
import { UpsertQuantityPriceDto } from './dto/upsert-quantity-price.dto';

@Injectable()
export class CatalogPricingService {
  constructor(
    private readonly tenantRunner: TenantSchemaRunner,
    private readonly variantPricing: VariantPricingService,
  ) {}

  async getProductPricingSummary(
    actor: JwtUserPayload,
    productId: string,
    opts?: { platformTenantId?: string },
  ) {
    let tenantId = actor.tenantId;
    if (PLATFORM_ROLES.includes(actor.role)) {
      tenantId = opts?.platformTenantId ?? null;
      if (!tenantId) {
        throw new BadRequestException('Query parameter tenantId is required for platform users.');
      }
    }
    if (!tenantId) throw new ForbiddenException('Tenant context required.');

    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const productsRepo = m.getRepository(Product);
      const variantsRepo = m.getRepository(ProductVariant);
      const customerPricesRepo = m.getRepository(CustomerPrice);
      const groupPricesRepo = m.getRepository(GroupPrice);
      const quantityPricesRepo = m.getRepository(QuantityPrice);
      const groupsRepo = m.getRepository(CustomerGroup);

      const product = await productsRepo.findOne({
        where: { id: productId, deletedAt: IsNull() },
      });
      if (!product) throw new NotFoundException('Product not found.');
      this.ensureTenantRead(actor, product.tenantId);

      const variants = await variantsRepo.find({
        where: { productId, deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
      });
      const vids = variants.map((v) => v.id);
      if (!vids.length) {
        const groups = await groupsRepo.find({
          where: { tenantId: product.tenantId, deletedAt: IsNull() },
          order: { name: 'ASC' },
        });
        return {
          success: true,
          data: {
            product: { id: product.id, name: product.name, slug: product.slug, tenantId: product.tenantId },
            variants: [],
            customerPrices: [],
            groupPrices: [],
            quantityPrices: [],
            groups: groups.map((g) => ({ id: g.id, name: g.name })),
          },
          message: '',
        };
      }

      const [cps, gps, qpsFiltered, groups] = await Promise.all([
        customerPricesRepo
          .createQueryBuilder('cp')
          .innerJoinAndSelect('cp.customer', 'cu', 'cu.deleted_at IS NULL')
          .where('cp.product_variant_id IN (:...vids)', { vids })
          .getMany(),
        groupPricesRepo
          .createQueryBuilder('gp')
          .innerJoinAndSelect('gp.group', 'g', 'g.deleted_at IS NULL')
          .where('gp.product_variant_id IN (:...vids)', { vids })
          .getMany(),
        quantityPricesRepo
          .createQueryBuilder('q')
          .where('q.product_variant_id IN (:...vids)', { vids })
          .orderBy('q.product_variant_id', 'ASC')
          .addOrderBy('q.min_qty', 'ASC')
          .getMany(),
        groupsRepo.find({
          where: { tenantId: product.tenantId, deletedAt: IsNull() },
          order: { name: 'ASC' },
        }),
      ]);

      return {
        success: true,
        data: {
          product: { id: product.id, name: product.name, slug: product.slug, tenantId: product.tenantId },
          variants: variants.map((v) => ({
            id: v.id,
            variantSku: v.variantSku,
            price: v.price,
            mrp: v.mrp,
            status: v.status,
          })),
          customerPrices: cps.map((cp) => ({
            id: cp.id,
            customerId: cp.customerId,
            customerName: (cp.customer as Customer)?.name ?? '',
            productVariantId: cp.productVariantId,
            price: cp.price,
          })),
          groupPrices: gps.map((gp) => ({
            id: gp.id,
            groupId: gp.groupId,
            groupName: (gp.group as CustomerGroup)?.name ?? '',
            productVariantId: gp.productVariantId,
            price: gp.price,
          })),
          quantityPrices: qpsFiltered.map((q) => ({
            id: q.id,
            productVariantId: q.productVariantId,
            minQty: q.minQty,
            price: q.price,
          })),
          groups: groups.map((g) => ({ id: g.id, name: g.name })),
        },
        message: '',
      };
    });
  }

  async upsertCustomerPrice(actor: JwtUserPayload, dto: UpsertCustomerPriceDto) {
    this.ensureWritable(actor);
    return this.tenantRunner.withTenantCatalog(actor.tenantId!, async (m) => {
      const { tenantId } = await this.loadVariantWithTenant(m, dto.productVariantId);
      this.ensureTenantRead(actor, tenantId);
      const customersRepo = m.getRepository(Customer);
      const customerPricesRepo = m.getRepository(CustomerPrice);
      const customer = await customersRepo.findOne({
        where: { id: dto.customerId, deletedAt: IsNull() },
      });
      if (!customer || customer.tenantId !== tenantId) throw new BadRequestException('Customer not found for this tenant.');

      let row = await customerPricesRepo.findOne({
        where: { customerId: dto.customerId, productVariantId: dto.productVariantId },
      });
      if (!row) {
        row = customerPricesRepo.create({
          customerId: dto.customerId,
          productVariantId: dto.productVariantId,
          price: dto.price,
        });
      } else {
        row.price = dto.price;
      }
      const saved = await customerPricesRepo.save(row);
      this.variantPricing.invalidateTenant(tenantId);
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async deleteCustomerPrice(actor: JwtUserPayload, id: string) {
    this.ensureWritable(actor);
    return this.tenantRunner.withTenantCatalog(actor.tenantId!, async (m) => {
      const customerPricesRepo = m.getRepository(CustomerPrice);
      const row = await customerPricesRepo.findOne({
        where: { id },
        relations: { productVariant: { product: true } },
      });
      if (!row) throw new NotFoundException('Row not found.');
      const tenantId = row.productVariant.product.tenantId;
      this.ensureTenantRead(actor, tenantId);
      await customerPricesRepo.delete({ id });
      this.variantPricing.invalidateTenant(tenantId);
      return { success: true, data: { deleted: true }, meta: {}, message: '' };
    });
  }

  async upsertGroupPrice(actor: JwtUserPayload, dto: UpsertGroupPriceDto) {
    this.ensureWritable(actor);
    return this.tenantRunner.withTenantCatalog(actor.tenantId!, async (m) => {
      const { tenantId } = await this.loadVariantWithTenant(m, dto.productVariantId);
      this.ensureTenantRead(actor, tenantId);
      const groupsRepo = m.getRepository(CustomerGroup);
      const groupPricesRepo = m.getRepository(GroupPrice);
      const group = await groupsRepo.findOne({
        where: { id: dto.groupId, deletedAt: IsNull() },
      });
      if (!group || group.tenantId !== tenantId) throw new BadRequestException('Group not found for this tenant.');

      let row = await groupPricesRepo.findOne({
        where: { groupId: dto.groupId, productVariantId: dto.productVariantId },
      });
      if (!row) {
        row = groupPricesRepo.create({
          groupId: dto.groupId,
          productVariantId: dto.productVariantId,
          price: dto.price,
        });
      } else {
        row.price = dto.price;
      }
      const saved = await groupPricesRepo.save(row);
      this.variantPricing.invalidateTenant(tenantId);
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async deleteGroupPrice(actor: JwtUserPayload, id: string) {
    this.ensureWritable(actor);
    return this.tenantRunner.withTenantCatalog(actor.tenantId!, async (m) => {
      const groupPricesRepo = m.getRepository(GroupPrice);
      const row = await groupPricesRepo.findOne({
        where: { id },
        relations: { productVariant: { product: true }, group: true },
      });
      if (!row) throw new NotFoundException('Row not found.');
      const tenantId = row.productVariant.product.tenantId;
      this.ensureTenantRead(actor, tenantId);
      await groupPricesRepo.delete({ id });
      this.variantPricing.invalidateTenant(tenantId);
      return { success: true, data: { deleted: true }, meta: {}, message: '' };
    });
  }

  async upsertQuantityPrice(actor: JwtUserPayload, dto: UpsertQuantityPriceDto) {
    this.ensureWritable(actor);
    return this.tenantRunner.withTenantCatalog(actor.tenantId!, async (m) => {
      const { tenantId } = await this.loadVariantWithTenant(m, dto.productVariantId);
      this.ensureTenantRead(actor, tenantId);
      const quantityPricesRepo = m.getRepository(QuantityPrice);

      let row = await quantityPricesRepo.findOne({
        where: { productVariantId: dto.productVariantId, minQty: dto.minQty },
      });
      if (!row) {
        row = quantityPricesRepo.create({
          productVariantId: dto.productVariantId,
          minQty: dto.minQty,
          price: dto.price,
        });
      } else {
        row.price = dto.price;
      }
      const saved = await quantityPricesRepo.save(row);
      this.variantPricing.invalidateTenant(tenantId);
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async deleteQuantityPrice(actor: JwtUserPayload, id: string) {
    this.ensureWritable(actor);
    return this.tenantRunner.withTenantCatalog(actor.tenantId!, async (m) => {
      const quantityPricesRepo = m.getRepository(QuantityPrice);
      const row = await quantityPricesRepo.findOne({
        where: { id },
        relations: { productVariant: { product: true } },
      });
      if (!row) throw new NotFoundException('Row not found.');
      const tenantId = row.productVariant.product.tenantId;
      this.ensureTenantRead(actor, tenantId);
      await quantityPricesRepo.delete({ id });
      this.variantPricing.invalidateTenant(tenantId);
      return { success: true, data: { deleted: true }, meta: {}, message: '' };
    });
  }

  async listCustomerGroups(actor: JwtUserPayload) {
    if (!actor.tenantId && !PLATFORM_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Tenant context required.');
    }
    if (PLATFORM_ROLES.includes(actor.role)) {
      throw new BadRequestException('Use tenant-scoped distributor login to list groups.');
    }
    return this.tenantRunner.withTenantCatalog(actor.tenantId!, async (m) => {
      const groupsRepo = m.getRepository(CustomerGroup);
      const rows = await groupsRepo.find({
        where: { tenantId: actor.tenantId!, deletedAt: IsNull() },
        order: { name: 'ASC' },
      });
      return { success: true, data: rows, meta: {}, message: '' };
    });
  }

  async createCustomerGroup(actor: JwtUserPayload, dto: CreateCustomerGroupDto) {
    this.ensureWritable(actor);
    const tenantId = actor.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context required.');
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const groupsRepo = m.getRepository(CustomerGroup);
      const saved = await groupsRepo.save(
        groupsRepo.create({ tenantId, name: dto.name.trim() }),
      );
      this.variantPricing.invalidateTenant(tenantId);
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async updateCustomerGroup(actor: JwtUserPayload, id: string, dto: UpdateCustomerGroupDto) {
    this.ensureWritable(actor);
    return this.tenantRunner.withTenantCatalog(actor.tenantId!, async (m) => {
      const groupsRepo = m.getRepository(CustomerGroup);
      const g = await groupsRepo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!g) throw new NotFoundException('Group not found.');
      this.ensureTenantRead(actor, g.tenantId);
      if (dto.name !== undefined) g.name = dto.name.trim();
      const saved = await groupsRepo.save(g);
      this.variantPricing.invalidateTenant(g.tenantId);
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async deleteCustomerGroup(actor: JwtUserPayload, id: string) {
    this.ensureWritable(actor);
    return this.tenantRunner.withTenantCatalog(actor.tenantId!, async (m) => {
      const groupsRepo = m.getRepository(CustomerGroup);
      const g = await groupsRepo.findOne({ where: { id, deletedAt: IsNull() } });
      if (!g) throw new NotFoundException('Group not found.');
      this.ensureTenantRead(actor, g.tenantId);
      await groupsRepo.softDelete({ id });
      this.variantPricing.invalidateTenant(g.tenantId);
      return { success: true, data: { deleted: true }, meta: {}, message: '' };
    });
  }

  async addGroupMember(actor: JwtUserPayload, groupId: string, dto: AddGroupMemberDto) {
    this.ensureWritable(actor);
    return this.tenantRunner.withTenantCatalog(actor.tenantId!, async (m) => {
      const groupsRepo = m.getRepository(CustomerGroup);
      const groupMapRepo = m.getRepository(CustomerGroupMap);
      const customersRepo = m.getRepository(Customer);

      const g = await groupsRepo.findOne({ where: { id: groupId, deletedAt: IsNull() } });
      if (!g) throw new NotFoundException('Group not found.');
      this.ensureTenantRead(actor, g.tenantId);
      const customer = await customersRepo.findOne({
        where: { id: dto.customerId, deletedAt: IsNull() },
      });
      if (!customer || customer.tenantId !== g.tenantId) throw new BadRequestException('Customer not in this tenant.');
      const existing = await groupMapRepo.findOne({
        where: { customerId: dto.customerId, groupId },
      });
      if (existing) {
        return { success: true, data: existing, meta: {}, message: '' };
      }
      const map = groupMapRepo.create({ customerId: dto.customerId, groupId });
      const saved = await groupMapRepo.save(map);
      this.variantPricing.invalidateTenant(g.tenantId);
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async removeGroupMember(actor: JwtUserPayload, groupId: string, customerId: string) {
    this.ensureWritable(actor);
    return this.tenantRunner.withTenantCatalog(actor.tenantId!, async (m) => {
      const groupsRepo = m.getRepository(CustomerGroup);
      const groupMapRepo = m.getRepository(CustomerGroupMap);
      const g = await groupsRepo.findOne({ where: { id: groupId, deletedAt: IsNull() } });
      if (!g) throw new NotFoundException('Group not found.');
      this.ensureTenantRead(actor, g.tenantId);
      await groupMapRepo.delete({ groupId, customerId });
      this.variantPricing.invalidateTenant(g.tenantId);
      return { success: true, data: { deleted: true }, meta: {}, message: '' };
    });
  }

  private async loadVariantWithTenant(m: EntityManager, variantId: string) {
    const variant = await m.getRepository(ProductVariant).findOne({
      where: { id: variantId, deletedAt: IsNull() },
      relations: { product: true },
    });
    if (!variant) throw new BadRequestException('Variant not found.');
    return { variant, tenantId: variant.product.tenantId };
  }

  private ensureTenantRead(actor: JwtUserPayload, recordTenantId: string) {
    if (PLATFORM_ROLES.includes(actor.role)) return;
    if (!actor.tenantId || actor.tenantId !== recordTenantId) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }
  }

  private ensureWritable(actor: JwtUserPayload) {
    if (actor.role === UserRole.STAFF) throw new ForbiddenException('STAFF has read-only permissions.');
    if (PLATFORM_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Platform roles cannot mutate tenant pricing here.');
    }
    if (!actor.tenantId) throw new ForbiddenException('Tenant context required.');
  }
}
