import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  EntityManager,
  In,
  IsNull,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { AttributeValue } from '../../common/entities/attribute-value.entity';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { ProductImage } from '../../common/entities/product-image.entity';
import { QuantityPrice } from '../../common/entities/quantity-price.entity';
import { Inventory } from '../../common/entities/inventory.entity';
import type {
  StorefrontProductQueryDto,
  StorefrontSort,
} from './dto/storefront-product-query.dto';
import { VariantPricingService } from '../catalog-pricing/variant-pricing.service';
import { TenantSchemaRunner } from '../../tenancy/tenant-schema-runner.service';
import { TranslationsService } from '../translations/translations.service';

const RESERVED = new Set([
  'category',
  'q',
  'min_price',
  'max_price',
  'in_stock',
  'sort',
  'page',
  'limit',
  'brand',
]);

export type StorefrontFilterBucket = {
  slug: string;
  value: string;
  count: number;
}[];

@Injectable()
export class StorefrontProductsService {
  private readonly log = new Logger(StorefrontProductsService.name);

  constructor(
    private readonly tenantRunner: TenantSchemaRunner,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepo: Repository<ProductVariant>,
    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(ProductImage)
    private readonly imagesRepo: Repository<ProductImage>,
    @InjectRepository(AttributeValue)
    private readonly attributeValuesRepo: Repository<AttributeValue>,
    private readonly variantPricing: VariantPricingService,
    private readonly translations: TranslationsService,
  ) {}

  /**
   * Storefront catalog list with variant-level filters.
   * Reads `products` / `product_variants` from the tenant Postgres schema (`search_path`).
   */
  async list(
    tenantId: string,
    rawQuery: Record<string, unknown>,
    dto: StorefrontProductQueryDto,
    opts?: { hideListPrices?: boolean; languageCode?: string },
  ) {
    const hideListPrices = opts?.hideListPrices === true;
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const categoryId = await this.resolveCategoryId(tenantId, dto.category);
    const minPrice =
      dto.min_price != null && !Number.isNaN(Number(dto.min_price))
        ? Number(dto.min_price)
        : undefined;
    const maxPrice =
      dto.max_price != null && !Number.isNaN(Number(dto.max_price))
        ? Number(dto.max_price)
        : undefined;
    const inStock = this.parseBool(dto.in_stock);
    const search = dto.q?.trim();
    const brand = dto.brand?.trim();
    const sort: StorefrontSort = dto.sort ?? 'newest';
    const attrFilters = this.extractAttributeFilters(rawQuery);

    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const productsRepo = m.getRepository(Product);
      const base = productsRepo
        .createQueryBuilder('p')
        .innerJoin(
          ProductVariant,
          'v',
          'v.product_id = p.id AND v.deleted_at IS NULL',
        )
        .where('p.tenant_id = :tenantId', { tenantId })
        .andWhere('p.deleted_at IS NULL')
        .andWhere("p.status = 'active'");

      if (categoryId) {
        base.andWhere(
          new Brackets((w) => {
            w.where('p.category_id = :categoryId', { categoryId }).orWhere(
              `EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = :categoryId)`,
              { categoryId },
            );
          }),
        );
      }
      if (brand) {
        base.andWhere("LOWER(COALESCE(p.brand, '')) = LOWER(:brand)", {
          brand,
        });
      }
      if (minPrice != null) {
        base.andWhere('CAST(v.price AS DECIMAL) >= :minPrice', { minPrice });
      }
      if (maxPrice != null) {
        base.andWhere('CAST(v.price AS DECIMAL) <= :maxPrice', { maxPrice });
      }
      if (inStock === true) {
        base.andWhere(
          `EXISTS (
          SELECT 1 FROM inventory i
          WHERE (i.variant_id = v.id OR (i.variant_id IS NULL AND i.product_id = p.id))
            AND (i.stock_quantity - COALESCE(i.reserved_stock, 0)) >= v.moq
        )`,
        );
      }
      if (search) {
        const s = `%${search.toLowerCase()}%`;
        base.andWhere(
          new Brackets((w) => {
            w.where('LOWER(p.name) LIKE :s', { s })
              .orWhere('LOWER(p.sku) LIKE :s', { s })
              .orWhere('LOWER(p.slug) LIKE :s', { s })
              .orWhere('LOWER(v.variant_sku) LIKE :s', { s });
          }),
        );
      }
      for (const [attrSlug, vals] of attrFilters) {
        this.applyAttributeFilter(base, attrSlug, vals);
      }

      const countQb = base.clone().select('COUNT(DISTINCT p.id)', 'cnt');
      const countRow = await countQb.getRawOne<{ cnt: string }>();
      const total = Number(countRow?.cnt ?? 0);

      const idQb = base
        .clone()
        .select('p.id', 'id')
        .addSelect('MIN(CAST(v.price AS DECIMAL))', 'min_variant_price')
        .groupBy('p.id');
      this.applySort(idQb, sort);

      const idRows = await idQb
        .offset(skip)
        .limit(limit)
        .getRawMany<{ id: string; min_variant_price: string }>();
      const ids = idRows.map((r) => r.id);
      const orderIndex = new Map(ids.map((id, i) => [id, i]));
      const items =
        ids.length === 0
          ? []
          : (
              await productsRepo.find({
                where: { id: In(ids) },
                relations: { category: true },
              })
            ).sort(
              (a, b) =>
                (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
            );

      const thumbs = await this.loadThumbnails(m, ids);
      const variantsByProduct = await this.loadActiveVariants(m, ids);
      const availableStockByVariant = await this.loadAvailableStockByVariantIds(
        m,
        [...variantsByProduct.values()].flat().map((variant) => variant.id),
      );
      const minPrices = new Map(idRows.map((r) => [r.id, r.min_variant_price]));

      const payload = await Promise.all(
        items.map(async (p) => {
          const nameKey = this.translations.entityKey(
            'product',
            p.slug,
            'name',
          );
          const variants = variantsByProduct.get(p.id) ?? [];
          const defaultVariant = variants[0] ?? null;
          const attrs = (defaultVariant?.attributesJson ?? {}) as Record<
            string,
            unknown
          >;
          const unit = this.attrText(attrs, 'unit');
          const packSize =
            this.attrText(attrs, 'packSize') ??
            this.attrText(attrs, 'pack_size');
          const listPrice = hideListPrices
            ? null
            : (minPrices.get(p.id) ?? p.price);
          const moq = defaultVariant?.moq ?? 1;
          return {
            id: p.id,
            name: await this.translations.translateRuntimeText(
              tenantId,
              opts?.languageCode,
              p.name,
              [nameKey, this.translations.entityKey('product', p.id, 'name')],
            ),
            slug: p.slug,
            sku: p.sku,
            price: listPrice,
            mrp: defaultVariant?.mrp ?? p.mrp,
            brand: p.brand,
            brandName: p.brand,
            categorySlug: p.category?.slug ?? null,
            category: p.category
              ? {
                  id: p.category.id,
                  name: p.category.name,
                  slug: p.category.slug,
                }
              : null,
            imageUrl: thumbs.get(p.id) ?? null,
            thumbnailUrl: thumbs.get(p.id) ?? null,
            description: p.description,
            barcode: p.barcode,
            hsnCode: p.hsnCode,
            unit,
            packSize,
            moq,
            stockQuantity: defaultVariant
              ? (availableStockByVariant.get(defaultVariant.id) ?? 0)
              : null,
            gstRate: defaultVariant?.gstRate ?? p.taxRate,
            variants: variants.map((v) => ({
              id: v.id,
              name:
                this.attrText(v.attributesJson, 'packSize') ??
                this.attrText(v.attributesJson, 'pack_size') ??
                v.variantSku,
              sku: v.variantSku,
              price: hideListPrices ? null : v.price,
              mrp: hideListPrices ? null : v.mrp,
              moq: v.moq,
              stockQuantity: availableStockByVariant.get(v.id) ?? 0,
              unit: this.attrText(v.attributesJson, 'unit'),
              packSize:
                this.attrText(v.attributesJson, 'packSize') ??
                this.attrText(v.attributesJson, 'pack_size'),
              attributes: v.attributesJson,
            })),
            priceSlabs: hideListPrices
              ? []
              : this.buildListPriceSlabs(Number(listPrice ?? 0), moq),
            translationKeys: {
              name: nameKey,
              description: this.translations.entityKey(
                'product',
                p.slug,
                'description',
              ),
            },
          };
        }),
      );

      const filters = await this.buildFilterAggregates(
        m,
        tenantId,
        categoryId,
        opts?.languageCode,
      );

      return {
        success: true,
        data: {
          items: payload,
          filters,
          meta: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit) || 0,
          },
        },
        message: '',
      };
    });
  }

  private extractAttributeFilters(
    raw: Record<string, unknown>,
  ): [string, string[]][] {
    const out: [string, string[]][] = [];
    for (const [k, v] of Object.entries(raw)) {
      if (RESERVED.has(k)) continue;
      if (v === undefined || v === null || v === '') continue;
      const vals = Array.isArray(v)
        ? v.flatMap((x) => String(x).split(','))
        : String(v).split(',');
      const cleaned = vals.map((s) => s.trim()).filter(Boolean);
      if (cleaned.length) out.push([k, cleaned]);
    }
    return out;
  }

  private applyAttributeFilter(
    qb: SelectQueryBuilder<Product>,
    paramSlug: string,
    valueSlugs: string[],
  ) {
    const slugNorm = paramSlug.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!slugNorm) return;
    const valsNorm = valueSlugs.map((x) => x.toLowerCase());
    const keys = Array.from(
      new Set([
        paramSlug,
        paramSlug.charAt(0).toUpperCase() + paramSlug.slice(1).toLowerCase(),
      ]),
    );
    const safeKeys = keys.filter((k) => /^[a-zA-Z0-9_-]+$/.test(k));
    const jsonKey = safeKeys[0] ?? slugNorm;

    qb.andWhere(
      new Brackets((wb) => {
        wb.where(
          `EXISTS (
            SELECT 1 FROM product_variant_attribute_values pvav
            INNER JOIN attribute_values av ON av.id = pvav.attribute_value_id AND av.deleted_at IS NULL
            INNER JOIN attributes a ON a.id = av.attribute_id AND a.deleted_at IS NULL
            WHERE pvav.product_variant_id = v.id
              AND LOWER(a.slug) = :an_${slugNorm}
              AND (LOWER(av.slug) IN (:...avs_${slugNorm}) OR LOWER(av.value) IN (:...avs_${slugNorm}))
          )`,
          { [`an_${slugNorm}`]: slugNorm, [`avs_${slugNorm}`]: valsNorm },
        ).orWhere(
          `LOWER(COALESCE(v.attributes_json->>'${jsonKey}', '')) IN (:...jvs_${slugNorm})`,
          {
            [`jvs_${slugNorm}`]: valsNorm,
          },
        );
      }),
    );
  }

  private applySort(qb: SelectQueryBuilder<Product>, sort: StorefrontSort) {
    switch (sort) {
      case 'price_asc':
        qb.orderBy('MIN(CAST(v.price AS DECIMAL))', 'ASC').addOrderBy(
          'p.id',
          'ASC',
        );
        break;
      case 'price_desc':
        qb.orderBy('MIN(CAST(v.price AS DECIMAL))', 'DESC').addOrderBy(
          'p.id',
          'DESC',
        );
        break;
      case 'best_selling':
        qb.orderBy('MAX(p.created_at)', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('MAX(p.created_at)', 'DESC');
        break;
    }
  }

  private async resolveCategoryId(
    tenantId: string,
    slug?: string,
  ): Promise<string | null> {
    if (!slug?.trim()) return null;
    const s = slug.trim().toLowerCase();
    const cat = await this.categoriesRepo
      .createQueryBuilder('c')
      .where('c.deleted_at IS NULL')
      .andWhere('LOWER(c.slug) = :s', { s })
      .andWhere('(c.tenant_id = :tid OR c.tenant_id IS NULL)', {
        tid: tenantId,
      })
      .orderBy('CASE WHEN c.tenant_id = :tid2 THEN 0 ELSE 1 END', 'ASC')
      .setParameter('tid2', tenantId)
      .getOne();
    return cat?.id ?? null;
  }

  private parseBool(v?: string): boolean | undefined {
    if (v === undefined || v === null || v === '') return undefined;
    const s = String(v).toLowerCase();
    if (s === '1' || s === 'true' || s === 'yes') return true;
    if (s === '0' || s === 'false' || s === 'no') return false;
    return undefined;
  }

  private async loadThumbnails(
    m: EntityManager,
    productIds: string[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!productIds.length) return map;
    const imgs = await m.getRepository(ProductImage).find({
      where: { productId: In(productIds) },
      order: { position: 'ASC' },
    });
    for (const im of imgs) {
      if (!map.has(im.productId)) map.set(im.productId, im.imageUrl);
    }
    return map;
  }

  private async loadActiveVariants(
    m: EntityManager,
    productIds: string[],
  ): Promise<Map<string, ProductVariant[]>> {
    const map = new Map<string, ProductVariant[]>();
    if (!productIds.length) return map;
    const variants = await m.getRepository(ProductVariant).find({
      where: {
        productId: In(productIds),
        deletedAt: IsNull(),
        status: 'active',
      },
      order: { createdAt: 'ASC' },
    });
    for (const variant of variants) {
      const rows = map.get(variant.productId) ?? [];
      rows.push(variant);
      map.set(variant.productId, rows);
    }
    return map;
  }

  private async loadAvailableStockByVariantIds(
    m: EntityManager,
    variantIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (variantIds.length === 0) return map;
    const rows = await m.getRepository(Inventory).find({
      where: { variantId: In(variantIds) },
    });
    for (const row of rows) {
      if (!row.variantId) continue;
      map.set(
        row.variantId,
        Math.max(0, row.stockQuantity - (row.reservedStock ?? 0)),
      );
    }
    return map;
  }

  private attrText(value: unknown, key: string): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return null;
    const raw = (value as Record<string, unknown>)[key];
    if (raw === undefined || raw === null) return null;
    const text = String(raw).trim();
    return text.length ? text : null;
  }

  private buildListPriceSlabs(price: number, moq: number) {
    if (!Number.isFinite(price) || price <= 0) return [];
    const minQty = Math.max(1, moq || 1);
    return [
      { minQty, price, label: `${minQty}+ units` },
      {
        minQty: minQty * 3,
        price: Number((price * 0.985).toFixed(2)),
        label: `${minQty * 3}+ units`,
      },
      {
        minQty: minQty * 8,
        price: Number((price * 0.965).toFixed(2)),
        label: `${minQty * 8}+ units`,
      },
    ];
  }

  private async buildFilterAggregates(
    m: EntityManager,
    tenantId: string,
    categoryId: string | null,
    languageCode?: string,
  ): Promise<Record<string, StorefrontFilterBucket>> {
    const qb = m
      .getRepository(AttributeValue)
      .createQueryBuilder('av')
      .innerJoin(
        'attributes',
        'a',
        'a.id = av.attribute_id AND a.deleted_at IS NULL',
      )
      .innerJoin(
        'product_variant_attribute_values',
        'pvav',
        'pvav.attribute_value_id = av.id',
      )
      .innerJoin(
        'product_variants',
        'v',
        'v.id = pvav.product_variant_id AND v.deleted_at IS NULL',
      )
      .innerJoin(
        'products',
        'p',
        'p.id = v.product_id AND p.deleted_at IS NULL',
      )
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere("p.status = 'active'")
      .andWhere('(a.tenant_id IS NULL OR a.tenant_id = :tenantId)', {
        tenantId,
      });

    if (categoryId) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('p.category_id = :categoryId', { categoryId }).orWhere(
            `EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id = :categoryId)`,
            { categoryId },
          );
        }),
      );
    }

    qb.select('a.slug', 'attr_slug')
      .addSelect('av.slug', 'value_slug')
      .addSelect('av.value', 'value_label')
      .addSelect('COUNT(DISTINCT p.id)', 'cnt')
      .groupBy('a.slug')
      .addGroupBy('av.slug')
      .addGroupBy('av.value')
      .orderBy('a.slug', 'ASC')
      .addOrderBy('cnt', 'DESC');

    let rows: {
      attr_slug: string;
      value_slug: string;
      value_label: string;
      cnt: string;
    }[] = [];
    try {
      rows = await qb.getRawMany();
    } catch (e) {
      this.log.warn(`Filter aggregates skipped: ${(e as Error).message}`);
    }

    const filters: Record<string, StorefrontFilterBucket> = {};
    for (const r of rows) {
      const key = r.attr_slug;
      if (!filters[key]) filters[key] = [];
      const labelKey = this.translations.entityKey(
        `attribute.${r.attr_slug}`,
        r.value_slug,
        'value',
      );
      filters[key].push({
        slug: r.value_slug,
        value: await this.translations.translateRuntimeText(
          tenantId,
          languageCode,
          r.value_label,
          [labelKey],
        ),
        count: Number(r.cnt) || 0,
      });
    }
    return filters;
  }

  async findBySlug(
    tenantId: string,
    slug: string,
    opts?: {
      customerId?: string | null;
      quantity?: number;
      hideVariantPrices?: boolean;
      languageCode?: string;
    },
  ) {
    const hideVariantPrices = opts?.hideVariantPrices === true;
    return this.tenantRunner.withTenantCatalog(tenantId, async (m) => {
      const productsRepo = m.getRepository(Product);
      const variantsRepo = m.getRepository(ProductVariant);
      const imagesRepo = m.getRepository(ProductImage);

      const product = await productsRepo.findOne({
        where: { tenantId, slug: slug.trim(), deletedAt: IsNull() },
        relations: { category: true },
      });
      if (!product || product.status !== 'active') {
        throw new NotFoundException('Product not found.');
      }
      const variants = await variantsRepo.find({
        where: { productId: product.id, deletedAt: IsNull(), status: 'active' },
        order: { createdAt: 'ASC' },
      });
      const availableStockByVariant = await this.loadAvailableStockByVariantIds(
        m,
        variants.map((variant) => variant.id),
      );
      const images = await imagesRepo.find({
        where: { productId: product.id },
        order: { position: 'ASC' },
      });
      const quantityPrices = variants.length
        ? await m.getRepository(QuantityPrice).find({
            where: { productVariantId: In(variants.map((variant) => variant.id)) },
            order: { minQty: 'ASC' },
          })
        : [];
      const variantRows = [];
      for (const v of variants) {
        const r = await this.variantPricing.resolveForVariant(v.id, {
          tenantId,
          customerId: opts?.customerId,
          quantity: opts?.quantity,
        });
        const attributesJson = await this.translateVariantAttributes(
          tenantId,
          opts?.languageCode,
          v.attributesJson,
        );
        variantRows.push(
          hideVariantPrices
            ? {
                id: v.id,
                sku: v.variantSku,
                attributesJson,
                moq: v.moq,
                gstRate: v.gstRate ?? product.taxRate,
                listPrice: null,
                mrp: null,
                price: null,
                priceBaseSource: null,
                quantityTierApplied: null,
                stockQuantity: availableStockByVariant.get(v.id) ?? 0,
                priceSlabs: [],
              }
            : {
                id: v.id,
                sku: v.variantSku,
                attributesJson,
                moq: v.moq,
                gstRate: v.gstRate ?? product.taxRate,
                listPrice: v.price,
                mrp: r.mrp,
                price: r.unitPrice,
                priceBaseSource: r.baseSource,
                quantityTierApplied: r.quantityTierApplied,
                stockQuantity: availableStockByVariant.get(v.id) ?? 0,
                priceSlabs: quantityPrices
                  .filter((tier) => tier.productVariantId === v.id)
                  .map((tier) => ({
                    minQty: tier.minQty,
                    price: tier.price,
                    label: `${tier.minQty}+ units`,
                  })),
              },
        );
      }
      const productNameKey = this.translations.entityKey(
        'product',
        product.slug,
        'name',
      );
      const productDescriptionKey = this.translations.entityKey(
        'product',
        product.slug,
        'description',
      );
      const brandKey = product.brand
        ? this.translations.entityKey('brand', product.brand, 'name')
        : '';
      return {
        success: true,
        data: {
          product: {
            id: product.id,
            name: await this.translations.translateRuntimeText(
              tenantId,
              opts?.languageCode,
              product.name,
              [
                productNameKey,
                this.translations.entityKey('product', product.id, 'name'),
              ],
            ),
            slug: product.slug,
            sku: product.sku,
            description: await this.translations.translateRuntimeText(
              tenantId,
              opts?.languageCode,
              product.description,
              [
                productDescriptionKey,
                this.translations.entityKey(
                  'product',
                  product.id,
                  'description',
                ),
              ],
            ),
            brand: product.brand
              ? await this.translations.translateRuntimeText(
                  tenantId,
                  opts?.languageCode,
                  product.brand,
                  [brandKey],
                )
              : product.brand,
            categorySlug: product.category?.slug ?? null,
            categoryName: product.category
              ? await this.translations.translateRuntimeText(
                  tenantId,
                  opts?.languageCode,
                  product.category.name,
                  [
                    this.translations.entityKey(
                      'category',
                      product.category.slug,
                      'name',
                    ),
                    this.translations.entityKey(
                      'category',
                      product.category.id,
                      'name',
                    ),
                  ],
                )
              : null,
            hsnCode: product.hsnCode,
            barcode: product.barcode,
            weight: product.weight,
            dimensions: product.dimensions,
            tags: product.tags ?? [],
            translationKeys: {
              name: productNameKey,
              description: productDescriptionKey,
              brand: brandKey || null,
            },
          },
          variants: variantRows,
          images: images.map((im) => ({
            id: im.id,
            url: im.imageUrl,
            isThumbnail: im.isThumbnail,
            variantId: im.variantId,
          })),
        },
        message: '',
      };
    });
  }

  private async translateVariantAttributes(
    tenantId: string,
    languageCode: string | null | undefined,
    value: unknown,
  ): Promise<unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return value;
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value)) {
      if (typeof raw !== 'string') {
        out[key] = raw;
        continue;
      }
      out[key] = await this.translations.translateRuntimeText(
        tenantId,
        languageCode,
        raw,
        [this.translations.entityKey(`attribute.${key}`, raw, 'value')],
      );
    }
    return out;
  }
}
