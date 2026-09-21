import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  In,
  IsNull,
  Repository,
} from 'typeorm';
import { AttributeValue } from '../../common/entities/attribute-value.entity';
import { Attribute } from '../../common/entities/attribute.entity';
import { CatalogAuditLog } from '../../common/entities/catalog-audit-log.entity';
import { Category } from '../../common/entities/category.entity';
import { Inventory } from '../../common/entities/inventory.entity';
import { ProductCategory } from '../../common/entities/product-category.entity';
import { ProductImage } from '../../common/entities/product-image.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { ProductVariantAttributeValue } from '../../common/entities/product-variant-attribute-value.entity';
import { Product } from '../../common/entities/product.entity';
import { SystemConfig } from '../../common/entities/system-config.entity';
import { Tenant } from '../../common/entities/tenant.entity';
import { TenantProfile } from '../../common/entities/tenant-profile.entity';
import { PLATFORM_ROLES, UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { UpsertInventoryDto } from './dto/upsert-inventory.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { BrandsService } from '../brands/brands.service';
import { StockAlertsService } from '../stock-alerts/stock-alerts.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tenantRunner: TenantSchemaRunner,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepo: Repository<ProductVariant>,
    @InjectRepository(ProductImage)
    private readonly imagesRepo: Repository<ProductImage>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(CatalogAuditLog)
    private readonly auditRepo: Repository<CatalogAuditLog>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(Attribute)
    private readonly attributesRepo: Repository<Attribute>,
    @InjectRepository(AttributeValue)
    private readonly attributeValuesRepo: Repository<AttributeValue>,
    @InjectRepository(ProductVariantAttributeValue)
    private readonly pvavRepo: Repository<ProductVariantAttributeValue>,
    @InjectRepository(ProductCategory)
    private readonly productCategoriesRepo: Repository<ProductCategory>,
    @InjectRepository(TenantProfile)
    private readonly tenantProfilesRepo: Repository<TenantProfile>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly brandsService: BrandsService,
    private readonly stockAlertsService: StockAlertsService,
  ) {}

  /** Locate which tenant schema holds a product (platform / cross-tenant lookups). */
  private async findTenantIdForProduct(
    productId: string,
  ): Promise<string | null> {
    const tenants = await this.dataSource.getRepository(Tenant).find({
      select: ['id', 'tenantSchemaProvisioned'],
    });
    for (const te of tenants) {
      if (!te.tenantSchemaProvisioned) continue;
      try {
        const found = await this.tenantRunner.withTenantCatalog(
          te.id,
          async (m) => {
            const n = await m
              .getRepository(Product)
              .count({ where: { id: productId, deletedAt: IsNull() } });
            return n > 0;
          },
        );
        if (found) return te.id;
      } catch {
        /* schema not ready */
      }
    }
    return null;
  }

  private catalogTenantIdForRead(
    actor: JwtUserPayload,
    query: ProductQueryDto,
  ): string {
    if (PLATFORM_ROLES.includes(actor.role)) {
      if (!query.tenantId) {
        throw new BadRequestException(
          'tenantId query parameter is required for platform catalog listing.',
        );
      }
      return query.tenantId;
    }
    if (!actor.tenantId)
      throw new ForbiddenException('Tenant context required.');
    return actor.tenantId;
  }

  private catalogTenantIdForProduct(
    actor: JwtUserPayload,
    productId: string,
  ): Promise<string> {
    if (PLATFORM_ROLES.includes(actor.role)) {
      return this.findTenantIdForProduct(productId).then((id) => {
        if (!id) throw new NotFoundException('Product not found.');
        return id;
      });
    }
    if (!actor.tenantId)
      throw new ForbiddenException('Tenant context required.');
    return Promise.resolve(actor.tenantId);
  }

  async list(actor: JwtUserPayload, query: ProductQueryDto) {
    const catalogTenantId = this.catalogTenantIdForRead(actor, query);
    return this.tenantRunner.withTenantCatalog(catalogTenantId, async (m) => {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const productsRepo = m.getRepository(Product);
      const qb = productsRepo
        .createQueryBuilder('p')
        .where('p.deleted_at IS NULL');
      if (PLATFORM_ROLES.includes(actor.role)) {
        qb.andWhere('p.tenant_id = :tenantId', { tenantId: catalogTenantId });
      } else {
        qb.andWhere('p.tenant_id = :tenantId', { tenantId: catalogTenantId });
      }
      if (query.search) {
        /** Join only when searching — avoids fragile `categories` resolution on some tenant `search_path` setups. */
        qb.leftJoin('categories', 'c', 'c.id = p.category_id');
        const search = `%${query.search.toLowerCase()}%`;
        qb.andWhere(
          new Brackets((sqb: any) => {
            sqb
              .where('LOWER(p.name) LIKE :search', { search })
              .orWhere('LOWER(p.sku) LIKE :search', { search })
              .orWhere("LOWER(COALESCE(p.brand, '')) LIKE :search", { search })
              .orWhere('LOWER(c.name) LIKE :search', { search })
              .orWhere(
                `EXISTS (
                SELECT 1 FROM product_variants pv
                WHERE pv.product_id = p.id
                  AND pv.deleted_at IS NULL
                  AND LOWER(pv.variant_sku) LIKE :search
              )`,
                { search },
              );
          }),
        );
      }
      if (query.categoryId) {
        qb.andWhere('p.category_id = :categoryId', {
          categoryId: query.categoryId,
        });
      }
      if (query.status) {
        qb.andWhere('p.status = :status', { status: query.status });
      }
      if (query.minPrice != null) {
        qb.andWhere('CAST(p.price AS numeric) >= :minPrice', {
          minPrice: query.minPrice,
        });
      }
      if (query.maxPrice != null) {
        qb.andWhere('CAST(p.price AS numeric) <= :maxPrice', {
          maxPrice: query.maxPrice,
        });
      }
      qb.orderBy('p.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);
      const [data, total] = await qb.getManyAndCount();
      const ids = data.map((p) => p.id);
      const [thumbMap, stockMap] = await Promise.all([
        this.loadThumbnailByProductIds(m, ids),
        this.loadStockTotalsByProductIds(m, ids),
      ]);
      const dataOut = data.map((p) =>
        this.serializeProductListRow(
          p,
          thumbMap.get(p.id) ?? null,
          stockMap.get(p.id) ?? 0,
        ),
      );
      return {
        success: true,
        data: dataOut,
        meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
        message: '',
      };
    });
  }

  async create(actor: JwtUserPayload, dto: CreateProductDto) {
    const tenantId = this.resolveTenantOnly(actor, dto.tenantId);
    const limits =
      await this.subscriptionsService.getPlanLimitByTenant(tenantId);
    const category = await this.categoriesRepo.findOne({
      where: { id: dto.categoryId, deletedAt: IsNull() },
    });
    if (!category) throw new BadRequestException('Category not found.');
    await this.ensureCategoryAllowedForTenant(actor, category, tenantId);

    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const productsRepo = m.getRepository(Product);
      const currentProducts = await productsRepo.count({
        where: { tenantId, deletedAt: IsNull() },
      });
      if (currentProducts >= limits.maxProducts) {
        throw new BadRequestException(
          `Plan product limit reached (${limits.maxProducts}).`,
        );
      }
      const {
        brandId: dtoBrandId,
        brandMasterId: dtoMasterId,
        brand: dtoBrandText,
      } = dto;
      if (dtoBrandId && dtoMasterId) {
        throw new BadRequestException(
          'Specify only one of brandId or brandMasterId.',
        );
      }
      const resolvedBrand = await this.brandsService.resolveBrandForProductSave(
        tenantId,
        {
          brandId: dtoBrandId,
          brandMasterId: dtoMasterId,
          brand: dtoBrandText ?? null,
        },
      );
      const saved = await productsRepo.save(
        productsRepo.create({
          tenantId,
          name: dto.name,
          slug: dto.slug,
          sku: dto.sku,
          description: dto.description,
          categoryId: dto.categoryId,
          price: dto.price,
          mrp: dto.mrp,
          taxRate: dto.taxRate,
          status: dto.status ?? 'draft',
          brandId: resolvedBrand.brandId,
          brand: resolvedBrand.brandLabel,
          metaTitle: dto.metaTitle ?? null,
          metaDescription: dto.metaDescription ?? null,
          metaKeywords: dto.metaKeywords ?? null,
          costPrice: dto.costPrice ?? null,
          tags: dto.tags && dto.tags.length ? dto.tags : [],
        }),
      );
      await this.log(
        actor,
        tenantId,
        'PRODUCT_CREATED',
        'PRODUCT',
        saved.id,
        null,
        saved,
      );
      await this.ensurePrimaryProductCategory(
        m,
        saved.id,
        saved.categoryId,
      ).catch((e) =>
        this.logger.warn(
          `product_categories link failed: ${(e as Error).message}`,
        ),
      );
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async update(actor: JwtUserPayload, id: string, dto: UpdateProductDto) {
    const schemaTid = await this.catalogTenantIdForProduct(actor, id);
    return this.tenantRunner.withTenantCatalog(schemaTid, async (m) => {
      const productsRepo = m.getRepository(Product);
      const product = await productsRepo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!product) throw new BadRequestException('Product not found.');
      this.ensureWritable(actor, product.tenantId);
      if (dto.categoryId) {
        const cat = await this.categoriesRepo.findOne({
          where: { id: dto.categoryId, deletedAt: IsNull() },
        });
        if (!cat) throw new BadRequestException('Category not found.');
        await this.ensureCategoryAllowedForTenant(actor, cat, product.tenantId);
      }
      if (dto.status === 'active') {
        const activeVariants = await m.getRepository(ProductVariant).count({
          where: { productId: id, status: 'active', deletedAt: IsNull() },
        });
        if (activeVariants === 0) {
          throw new BadRequestException(
            'Add at least one active variant before publishing the product.',
          );
        }
      }
      const oldValue = { ...product };
      const {
        brandId: dtoBrandId,
        brandMasterId: dtoMasterId,
        brand: dtoBrandText,
        ...dtoRest
      } = dto;
      Object.assign(product, dtoRest);
      if (
        dtoBrandId !== undefined ||
        dtoMasterId !== undefined ||
        dtoBrandText !== undefined
      ) {
        if (dtoBrandId && dtoMasterId) {
          throw new BadRequestException(
            'Specify only one of brandId or brandMasterId.',
          );
        }
        if (typeof dtoMasterId === 'string' && dtoMasterId.length > 0) {
          const resolvedBrand =
            await this.brandsService.resolveBrandForProductSave(
              product.tenantId,
              {
                brandMasterId: dtoMasterId,
                brand: dtoBrandText ?? null,
              },
            );
          product.brandId = resolvedBrand.brandId;
          product.brand = resolvedBrand.brandLabel;
        } else if (dtoMasterId === null) {
          product.brandId = null;
          if (dtoBrandText !== undefined) {
            product.brand = dtoBrandText?.trim() || null;
          }
        } else if (dtoBrandId !== undefined) {
          if (dtoBrandId === null) {
            product.brandId = null;
            product.brand =
              dtoBrandText !== undefined ? dtoBrandText?.trim() || null : null;
          } else {
            const resolvedBrand =
              await this.brandsService.resolveBrandForProductSave(
                product.tenantId,
                {
                  brandId: dtoBrandId,
                  brand: dtoBrandText ?? null,
                },
              );
            product.brandId = resolvedBrand.brandId;
            product.brand = resolvedBrand.brandLabel;
          }
        } else if (dtoBrandText !== undefined) {
          product.brand = dtoBrandText.trim() || null;
        }
      }
      const saved = await productsRepo.save(product);
      await this.log(
        actor,
        product.tenantId,
        'PRODUCT_UPDATED',
        'PRODUCT',
        saved.id,
        oldValue,
        saved,
      );
      if (dto.price && dto.price !== oldValue.price) {
        await this.log(
          actor,
          product.tenantId,
          'PRICE_CHANGED',
          'PRODUCT',
          saved.id,
          { price: oldValue.price },
          { price: saved.price },
        );
      }
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async remove(actor: JwtUserPayload, id: string) {
    const schemaTid = await this.catalogTenantIdForProduct(actor, id);
    return this.tenantRunner.withTenantCatalog(schemaTid, async (m) => {
      const productsRepo = m.getRepository(Product);
      const product = await productsRepo.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!product) throw new BadRequestException('Product not found.');
      this.ensureWritable(actor, product.tenantId);
      await productsRepo.softDelete({ id });
      await this.log(
        actor,
        product.tenantId,
        'PRODUCT_DELETED',
        'PRODUCT',
        id,
        product,
        null,
      );
      return { success: true, data: { deleted: true }, meta: {}, message: '' };
    });
  }

  /** Plain row for `GET /products` list — same rationale as `serializeProductDetailBundle`. */
  private serializeProductListRow(
    p: Product,
    thumbnailUrl: string | null,
    totalStock: number,
  ) {
    return {
      id: p.id,
      tenantId: p.tenantId,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      description: p.description,
      categoryId: p.categoryId,
      price: p.price,
      mrp: p.mrp,
      taxRate: p.taxRate,
      status: p.status,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      metaKeywords: p.metaKeywords,
      costPrice: p.costPrice,
      tags: Array.isArray(p.tags) ? p.tags : [],
      brandId: p.brandId,
      brand: p.brand,
      weight: p.weight,
      dimensions: p.dimensions,
      hsnCode: p.hsnCode,
      barcode: p.barcode,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      deletedAt: p.deletedAt,
      thumbnailUrl,
      totalStock,
    };
  }

  /**
   * Plain JSON for `GET /products/:id` — avoids returning TypeORM entity graphs
   * (nested relations / proxies) that can break `res.json()` with circular refs.
   */
  private serializeProductDetailBundle(input: {
    product: Product;
    brandSlot:
      | { kind: 'none'; legacyName: string | null | undefined }
      | { kind: 'master'; masterBrandId: string; brandId: string }
      | { kind: 'tenant'; brandId: string };
    variants: ProductVariant[];
    images: ProductImage[];
    inventory: Inventory[];
  }) {
    const { product, brandSlot, variants, images, inventory } = input;
    const c = product.category;
    const category =
      c != null
        ? {
            id: c.id,
            name: c.name,
            slug: c.slug,
            tenantId: c.tenantId,
            parentId: c.parentId,
            industryId: c.industryId,
            level: c.level,
            status: c.status,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          }
        : null;

    const productOut = {
      id: product.id,
      tenantId: product.tenantId,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      categoryId: product.categoryId,
      category,
      price: product.price,
      mrp: product.mrp,
      taxRate: product.taxRate,
      status: product.status,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      metaKeywords: product.metaKeywords,
      costPrice: product.costPrice,
      tags: Array.isArray(product.tags) ? product.tags : [],
      brandId: product.brandId,
      brand: product.brand,
      weight: product.weight,
      dimensions: product.dimensions,
      hsnCode: product.hsnCode,
      barcode: product.barcode,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
      brandSlot,
    };

    return {
      product: productOut,
      variants: variants.map((v) => ({
        id: v.id,
        productId: v.productId,
        variantSku: v.variantSku,
        price: v.price,
        mrp: v.mrp,
        moq: v.moq,
        gstRate: v.gstRate ?? null,
        stockQuantity: v.stockQuantity,
        attributesJson: v.attributesJson ?? {},
        status: v.status,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        deletedAt: v.deletedAt,
      })),
      images: images.map((im) => ({
        id: im.id,
        productId: im.productId,
        variantId: im.variantId,
        imageUrl: im.imageUrl,
        isThumbnail: im.isThumbnail,
        position: im.position,
        createdAt: im.createdAt,
      })),
      inventory: inventory.map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        stockQuantity: i.stockQuantity,
        reservedStock: i.reservedStock,
        lowStockThreshold: i.lowStockThreshold,
        stockStatus: i.stockStatus,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })),
    };
  }

  async findOne(actor: JwtUserPayload, id: string) {
    const schemaTid = await this.catalogTenantIdForProduct(actor, id);
    return this.tenantRunner.withTenantCatalog(schemaTid, async (m) => {
      const productsRepo = m.getRepository(Product);
      const variantsRepo = m.getRepository(ProductVariant);
      const imagesRepo = m.getRepository(ProductImage);
      const inventoryRepo = m.getRepository(Inventory);

      const product = await productsRepo.findOne({
        where: { id, deletedAt: IsNull() },
        relations: { category: true, brandRef: { masterBrand: true } },
      });
      if (!product) throw new BadRequestException('Product not found.');
      if (!PLATFORM_ROLES.includes(actor.role)) {
        if (!actor.tenantId || product.tenantId !== actor.tenantId) {
          throw new ForbiddenException('Cross-tenant access denied.');
        }
      }
      const variants = await variantsRepo.find({
        where: { productId: id, deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
      });
      const images = await imagesRepo.find({
        where: { productId: id },
        order: { position: 'ASC' },
      });
      const inventory = await inventoryRepo.find({ where: { productId: id } });

      const brandSlot = (() => {
        if (!product.brandId) {
          return { kind: 'none' as const, legacyName: product.brand };
        }
        const br = product.brandRef;
        if (!br) {
          return { kind: 'none' as const, legacyName: product.brand };
        }
        if (br.masterBrandId) {
          return {
            kind: 'master' as const,
            masterBrandId: br.masterBrandId,
            brandId: product.brandId,
          };
        }
        return { kind: 'tenant' as const, brandId: product.brandId };
      })();

      const data = this.serializeProductDetailBundle({
        product,
        brandSlot,
        variants,
        images,
        inventory,
      });
      return {
        success: true,
        data,
        message: '',
      };
    });
  }

  async createVariant(
    actor: JwtUserPayload,
    productId: string,
    dto: CreateProductVariantDto,
  ) {
    const schemaTid = await this.catalogTenantIdForProduct(actor, productId);
    return this.tenantRunner.withTenantCatalog(schemaTid, async (m) => {
      const productsRepo = m.getRepository(Product);
      const variantsRepo = m.getRepository(ProductVariant);
      const product = await productsRepo.findOne({
        where: { id: productId, deletedAt: IsNull() },
      });
      if (!product) throw new BadRequestException('Product not found.');
      this.ensureWritable(actor, product.tenantId);
      const saved = await variantsRepo.save(
        variantsRepo.create({
          productId,
          variantSku: dto.variantSku,
          price: dto.price,
          mrp: dto.mrp,
          stockQuantity: dto.stockQuantity,
          attributesJson: dto.attributesJson,
          status: dto.status ?? 'active',
          moq: dto.moq ?? 1,
          gstRate: dto.gstRate ?? null,
        }),
      );
      await this.log(
        actor,
        product.tenantId,
        'VARIANT_UPDATED',
        'PRODUCT_VARIANT',
        saved.id,
        null,
        saved,
      );
      void this.syncVariantFacetLinks(
        m,
        saved.id,
        product.tenantId,
        saved.attributesJson,
      ).catch((e) =>
        this.logger.warn(`Facet sync failed: ${(e as Error).message}`),
      );
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async updateVariant(
    actor: JwtUserPayload,
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ) {
    const schemaTid = await this.catalogTenantIdForProduct(actor, productId);
    return this.tenantRunner.withTenantCatalog(schemaTid, async (m) => {
      const productsRepo = m.getRepository(Product);
      const variantsRepo = m.getRepository(ProductVariant);
      const product = await productsRepo.findOne({
        where: { id: productId, deletedAt: IsNull() },
      });
      if (!product) throw new BadRequestException('Product not found.');
      this.ensureWritable(actor, product.tenantId);
      const variant = await variantsRepo.findOne({
        where: { id: variantId, productId, deletedAt: IsNull() },
      });
      if (!variant) throw new BadRequestException('Variant not found.');
      const oldValue = { ...variant };
      Object.assign(variant, dto);
      const saved = await variantsRepo.save(variant);
      await this.log(
        actor,
        product.tenantId,
        'VARIANT_UPDATED',
        'PRODUCT_VARIANT',
        saved.id,
        oldValue,
        saved,
      );
      void this.syncVariantFacetLinks(
        m,
        saved.id,
        product.tenantId,
        saved.attributesJson,
      ).catch((e) =>
        this.logger.warn(`Facet sync failed: ${(e as Error).message}`),
      );
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async addImage(
    actor: JwtUserPayload,
    productId: string,
    dto: CreateProductImageDto,
  ) {
    const schemaTid = await this.catalogTenantIdForProduct(actor, productId);
    return this.tenantRunner.withTenantCatalog(schemaTid, async (m) => {
      const productsRepo = m.getRepository(Product);
      const variantsRepo = m.getRepository(ProductVariant);
      const imagesRepo = m.getRepository(ProductImage);

      const product = await productsRepo.findOne({
        where: { id: productId, deletedAt: IsNull() },
      });
      if (!product) throw new BadRequestException('Product not found.');
      this.ensureWritable(actor, product.tenantId);

      const maxImages = await this.getMaxImagesPerProduct(product.tenantId);
      const maxImageSizeMb = await this.getMaxImageSizeMb(product.tenantId);
      const allowedFormats = await this.getAllowedImageFormats(
        product.tenantId,
      );
      const count = await imagesRepo.count({ where: { productId } });
      if (count >= maxImages)
        throw new BadRequestException(
          `Max images per product exceeded (${maxImages}).`,
        );
      if (dto.variantId) {
        const v = await variantsRepo.findOne({
          where: { id: dto.variantId, productId, deletedAt: IsNull() },
        });
        if (!v)
          throw new BadRequestException('Variant not found for this product.');
      }

      const ext = this.extractExtension(dto.imageUrl);
      if (!allowedFormats.includes(ext))
        throw new BadRequestException(
          `Image format not allowed. Allowed formats: ${allowedFormats.join(', ')}`,
        );
      const sizeMb = dto.imageSizeMb ?? 0.01;
      if (sizeMb > maxImageSizeMb) {
        throw new BadRequestException(
          `Image size exceeds limit (${maxImageSizeMb}MB).`,
        );
      }

      const saved = await imagesRepo.save(
        imagesRepo.create({
          productId,
          variantId: dto.variantId ?? null,
          imageUrl: dto.imageUrl,
          isThumbnail: dto.isThumbnail,
          position: dto.position,
        }),
      );
      return { success: true, data: saved, meta: {}, message: '' };
    });
  }

  async upsertInventory(actor: JwtUserPayload, dto: UpsertInventoryDto) {
    if (dto.stockQuantity < 0)
      throw new BadRequestException('Negative stock not allowed.');
    const schemaTid = await this.catalogTenantIdForProduct(
      actor,
      dto.productId,
    );
    return this.tenantRunner.withTenantCatalog(schemaTid, async (m) => {
      const productsRepo = m.getRepository(Product);
      const inventoryRepo = m.getRepository(Inventory);

      const product = await productsRepo.findOne({
        where: { id: dto.productId, deletedAt: IsNull() },
      });
      if (!product) throw new BadRequestException('Product not found.');
      this.ensureWritable(actor, product.tenantId);

      let row = await inventoryRepo.findOne({
        where: {
          productId: dto.productId,
          variantId: dto.variantId ? dto.variantId : IsNull(),
        },
      });
      const previousAvailable = row
        ? Math.max(0, row.stockQuantity - (row.reservedStock ?? 0))
        : 0;
      const stockStatus = dto.stockQuantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
      const isLowStock =
        dto.stockQuantity > 0 && dto.stockQuantity <= dto.lowStockThreshold;

      if (!row) {
        row = inventoryRepo.create({
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          stockQuantity: dto.stockQuantity,
          lowStockThreshold: dto.lowStockThreshold,
          stockStatus,
        });
      } else {
        const oldValue = { ...row };
        row.stockQuantity = dto.stockQuantity;
        row.lowStockThreshold = dto.lowStockThreshold;
        row.stockStatus = stockStatus;
        await this.log(
          actor,
          product.tenantId,
          'STOCK_CHANGED',
          'INVENTORY',
          row.id,
          oldValue,
          row,
        );
      }

      const saved = await inventoryRepo.save(row);
      await this.log(
        actor,
        product.tenantId,
        'STOCK_CHANGED',
        'INVENTORY',
        saved.id,
        null,
        saved,
      );
      const variant = dto.variantId
        ? await m.getRepository(ProductVariant).findOne({
            where: {
              id: dto.variantId,
              productId: product.id,
              deletedAt: IsNull(),
            },
          })
        : null;
      const availableStock = Math.max(
        0,
        saved.stockQuantity - (saved.reservedStock ?? 0),
      );
      const minimumOrderQuantity = variant?.moq ?? 1;
      const notifiedSubscribers =
        previousAvailable < minimumOrderQuantity &&
        availableStock >= minimumOrderQuantity
          ? await this.stockAlertsService.notifyRestocked({
              tenantId: product.tenantId,
              productId: product.id,
              variantId: dto.variantId ?? null,
              productName: product.name,
              variantName: variant?.variantSku ?? null,
              productSlug: product.slug,
              availableStock,
              minimumOrderQuantity,
            })
          : 0;
      return {
        success: true,
        data: { ...saved, isLowStock, notifiedSubscribers },
        meta: {},
        message: '',
      };
    });
  }

  private ensureTenantRead(
    actor: JwtUserPayload,
    recordTenantId: string | null,
    expectedTenantId?: string,
  ) {
    if (PLATFORM_ROLES.includes(actor.role)) return;
    if (!actor.tenantId)
      throw new ForbiddenException('Tenant context required.');
    const target = expectedTenantId ?? recordTenantId;
    if (target && target !== actor.tenantId)
      throw new ForbiddenException('Cross-tenant access denied.');
  }

  private ensureWritable(actor: JwtUserPayload, recordTenantId: string | null) {
    if (actor.role === UserRole.STAFF)
      throw new ForbiddenException('STAFF has read-only permissions.');
    if (PLATFORM_ROLES.includes(actor.role)) return;
    if (!actor.tenantId || actor.tenantId !== recordTenantId)
      throw new ForbiddenException('Cross-tenant write access denied.');
  }

  private async ensureCategoryAllowedForTenant(
    actor: JwtUserPayload,
    category: Category,
    tenantId: string,
  ) {
    this.ensureTenantRead(actor, category.tenantId, tenantId);
    if (category.status !== 'active') {
      throw new BadRequestException(
        'Only an active category can be assigned to a product.',
      );
    }
    if (category.tenantId !== null && category.tenantId !== tenantId) {
      throw new ForbiddenException('Category belongs to another tenant.');
    }
    if (category.tenantId === null) {
      const profile = await this.tenantProfilesRepo.findOne({
        where: { tenantId },
      });
      if (
        !profile?.industryId ||
        !category.industryId ||
        profile.industryId !== category.industryId
      ) {
        throw new BadRequestException(
          'Global category is not assigned to this tenant industry.',
        );
      }
    }
  }

  private resolveTenantOnly(
    actor: JwtUserPayload,
    requestedTenantId?: string,
  ): string {
    if (PLATFORM_ROLES.includes(actor.role)) {
      if (!requestedTenantId)
        throw new BadRequestException('tenantId is required for products.');
      return requestedTenantId;
    }
    if (!actor.tenantId)
      throw new ForbiddenException('Tenant context required.');
    if (requestedTenantId && requestedTenantId !== actor.tenantId) {
      throw new ForbiddenException('Cannot write into another tenant.');
    }
    return actor.tenantId;
  }

  private async log(
    actor: JwtUserPayload,
    tenantId: string | null,
    eventType: string,
    entityType: string,
    entityId: string,
    oldValue: unknown,
    newValue: unknown,
  ) {
    await this.auditRepo.save(
      this.auditRepo.create({
        tenantId,
        userId: actor.sub,
        eventType,
        entityType,
        entityId,
        oldValue: oldValue
          ? (JSON.parse(JSON.stringify(oldValue)) as Record<string, unknown>)
          : null,
        newValue: newValue
          ? (JSON.parse(JSON.stringify(newValue)) as Record<string, unknown>)
          : null,
      }),
    );
  }

  private async getMaxImagesPerProduct(tenantId: string): Promise<number> {
    const tenantConfig = await this.configRepo.findOne({
      where: { key: `tenant:${tenantId}:max_images_per_product` },
    });
    if (tenantConfig?.value) return Number(tenantConfig.value) || 10;
    const globalConfig = await this.configRepo.findOne({
      where: { key: 'catalog:max_images_per_product' },
    });
    if (globalConfig?.value) return Number(globalConfig.value) || 10;
    return 10;
  }

  private async getMaxImageSizeMb(tenantId: string): Promise<number> {
    const tenantConfig = await this.configRepo.findOne({
      where: { key: `tenant:${tenantId}:max_image_size_mb` },
    });
    if (tenantConfig?.value) return Number(tenantConfig.value) || 2;
    const globalConfig = await this.configRepo.findOne({
      where: { key: 'catalog:max_image_size_mb' },
    });
    if (globalConfig?.value) return Number(globalConfig.value) || 2;
    return 2;
  }

  private async getAllowedImageFormats(tenantId: string): Promise<string[]> {
    const tenantConfig = await this.configRepo.findOne({
      where: { key: `tenant:${tenantId}:allowed_formats` },
    });
    if (tenantConfig?.value)
      return tenantConfig.value
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
    const globalConfig = await this.configRepo.findOne({
      where: { key: 'catalog:allowed_formats' },
    });
    if (globalConfig?.value)
      return globalConfig.value
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
    return ['jpg', 'jpeg', 'png', 'webp'];
  }

  private async ensurePrimaryProductCategory(
    m: EntityManager,
    productId: string,
    categoryId: string,
  ): Promise<void> {
    const productCategoriesRepo = m.getRepository(ProductCategory);
    const n = await productCategoriesRepo.count({
      where: { productId, categoryId },
    });
    if (n === 0) {
      await productCategoriesRepo.save(
        productCategoriesRepo.create({ productId, categoryId }),
      );
    }
  }

  private async syncVariantFacetLinks(
    m: EntityManager,
    variantId: string,
    tenantId: string,
    attributesJson: Record<string, unknown> | null,
  ): Promise<void> {
    const pvavRepo = m.getRepository(ProductVariantAttributeValue);
    await pvavRepo.delete({ productVariantId: variantId });
    if (!attributesJson || typeof attributesJson !== 'object') return;
    for (const [rawKey, rawVal] of Object.entries(attributesJson)) {
      if (rawKey.startsWith('_')) continue;
      const valStr = rawVal == null ? '' : String(rawVal).trim();
      if (!valStr) continue;
      const attr = await this.attributesRepo
        .createQueryBuilder('a')
        .where('a.deleted_at IS NULL')
        .andWhere('LOWER(a.slug) = LOWER(:sk)', { sk: rawKey })
        .andWhere('(a.tenant_id IS NULL OR a.tenant_id = :tid)', {
          tid: tenantId,
        })
        .orderBy('CASE WHEN a.tenant_id = :tid2 THEN 0 ELSE 1 END', 'ASC')
        .setParameter('tid2', tenantId)
        .getOne();
      if (!attr) continue;
      const slugBase = valStr
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 200);
      const slug = slugBase.length ? slugBase : 'v';
      let av = await this.attributeValuesRepo.findOne({
        where: { attributeId: attr.id, slug, deletedAt: IsNull() },
      });
      if (!av) {
        av = await this.attributeValuesRepo.save(
          this.attributeValuesRepo.create({
            attributeId: attr.id,
            value: valStr.slice(0, 255),
            slug: slug.slice(0, 255),
            status: 'active',
          }),
        );
      }
      await pvavRepo.save(
        pvavRepo.create({
          productVariantId: variantId,
          attributeValueId: av.id,
        }),
      );
    }
  }

  private extractExtension(url: string): string {
    const clean = url.split('?')[0].split('#')[0];
    const dot = clean.lastIndexOf('.');
    return dot === -1 ? '' : clean.substring(dot + 1).toLowerCase();
  }

  private async loadThumbnailByProductIds(
    m: EntityManager,
    productIds: string[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!productIds.length) return map;
    const images = await m.getRepository(ProductImage).find({
      where: { productId: In(productIds) },
      order: { position: 'ASC' },
    });
    for (const img of images) {
      if (!map.has(img.productId)) map.set(img.productId, img.imageUrl);
    }
    return map;
  }

  private async loadStockTotalsByProductIds(
    m: EntityManager,
    productIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!productIds.length) return map;
    const rows = await m
      .getRepository(Inventory)
      .createQueryBuilder('i')
      .select('i.product_id', 'productId')
      .addSelect('SUM(i.stock_quantity)', 'total')
      .where('i.product_id IN (:...ids)', { ids: productIds })
      .groupBy('i.product_id')
      .getRawMany<{ productId: string; total: string }>();
    for (const r of rows) {
      map.set(r.productId, Number(r.total) || 0);
    }
    return map;
  }
}
