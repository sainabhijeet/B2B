import type { ThemePreviewCatalog } from "@/lib/resolve-storefront-theme";
import type { StorefrontCategory } from "@/services/categoryService";
import type { StorefrontProduct, StorefrontProductDetail } from "@/services/productService";

export type ThemePreviewProduct = StorefrontProduct & {
  categorySlug: string;
  categoryName: string | null;
  stock: number | null;
  moq: number;
  sku: string;
  compareAtPrice: number | null;
  unit: string | null;
  packSize: string | null;
  badge: string | null;
  leadTime: string | null;
  features: string[];
  attributes: Record<string, string | number | boolean | null> | null;
  rating: number | null;
  reviewCount: number | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function primitiveRecord(value: unknown): Record<string, string | number | boolean | null> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value).filter((entry): entry is [string, string | number | boolean | null] => {
    const item = entry[1];
    return item == null || ["string", "number", "boolean"].includes(typeof item);
  });
  return entries.length ? Object.fromEntries(entries) : null;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}

export function themePreviewCategories(catalog: ThemePreviewCatalog | null | undefined): StorefrontCategory[] {
  if (!Array.isArray(catalog?.categories)) return [];
  return catalog.categories.flatMap((row, index) => {
    const name = text(row.name ?? row.title);
    if (!name) return [];
    const slug = text(row.slug) || slugify(name) || `preview-category-${index + 1}`;
    return [{
      id: text(row.id) || `preview-category-${slug}`,
      slug,
      name,
      description: text(row.description ?? row.subtitle),
      level: 0,
      parentId: null,
      imageUrl: text(row.image ?? row.imageUrl ?? row.image_url) || null,
      bannerUrl: text(row.banner ?? row.bannerUrl ?? row.banner_url) || null,
    }];
  });
}

export function themePreviewProducts(catalog: ThemePreviewCatalog | null | undefined): ThemePreviewProduct[] {
  if (!Array.isArray(catalog?.products)) return [];
  return catalog.products.flatMap((row, index) => {
    const name = text(row.name ?? row.title);
    if (!name) return [];
    const slug = text(row.slug) || slugify(name) || `preview-product-${index + 1}`;
    return [{
      id: text(row.id) || `preview-product-${slug}`,
      slug,
      name,
      description: text(row.description ?? row.subtitle),
      price: number(row.price),
      currency: text(row.currency) || "INR",
      image: text(row.image ?? row.imageUrl ?? row.image_url) || undefined,
      brand: text(row.brand) || null,
      categorySlug: text(row.category ?? row.categorySlug ?? row.category_slug),
      categoryName: text(row.categoryName ?? row.category_name) || null,
      stock: number(row.stock ?? row.stockQuantity ?? row.stock_quantity),
      moq: Math.max(1, number(row.moq) ?? 1),
      sku: text(row.sku) || `DEMO-${index + 1}`,
      compareAtPrice: number(row.compareAtPrice ?? row.compare_at_price ?? row.mrp),
      unit: text(row.unit) || null,
      packSize: text(row.packSize ?? row.pack_size) || null,
      badge: text(row.badge) || null,
      leadTime: text(row.leadTime ?? row.lead_time) || null,
      features: stringList(row.features ?? row.highlights ?? row.tags),
      attributes: primitiveRecord(row.attributes ?? row.specifications),
      rating: number(row.rating),
      reviewCount: number(row.reviewCount ?? row.review_count),
    }];
  });
}

export function themePreviewProductDetail(
  catalog: ThemePreviewCatalog | null | undefined,
  slug: string,
): StorefrontProductDetail | null {
  const products = themePreviewProducts(catalog);
  const product = products.find((item) => item.slug === slug);
  if (!product) return null;
  const raw = Array.isArray(catalog?.products)
    ? catalog.products.find((row) => text(row.slug) === slug) ?? {}
    : {};
  const productId = product.id ?? `preview-product-${product.slug}`;
  const price = product.price == null ? null : String(product.price);
  const compareAt = number(raw.compareAtPrice ?? raw.compare_at_price);
  const bulkPrices = Array.isArray(raw.bulkPrices)
    ? raw.bulkPrices.flatMap((tier) => {
        if (!tier || typeof tier !== "object" || Array.isArray(tier)) return [];
        const row = tier as Record<string, unknown>;
        const minQty = number(row.minQuantity ?? row.minQty ?? row.min_quantity);
        const unitPrice = number(row.unitPrice ?? row.price ?? row.unit_price);
        return minQty != null && unitPrice != null
          ? [{ minQty, price: String(unitPrice), label: text(row.label) || undefined }]
          : [];
      })
    : [];

  return {
    product: {
      id: productId,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      brand: product.brand ?? null,
      categorySlug: product.categorySlug || null,
      categoryName: text(raw.categoryName ?? raw.category_name) || null,
      tags: Array.isArray(raw.tags) ? raw.tags.map(text).filter(Boolean) : [],
    },
    variants: [{
      id: `${productId}-variant`,
      sku: product.sku,
      listPrice: compareAt == null ? price : String(compareAt),
      mrp: compareAt == null ? null : String(compareAt),
      price,
      priceBaseSource: "THEME_PREVIEW",
      quantityTierApplied: false,
      stockQuantity: product.stock,
      moq: product.moq,
      attributesJson: {},
      priceSlabs: bulkPrices,
    }],
    images: product.image
      ? [{ id: `${productId}-image`, url: product.image, isThumbnail: true, variantId: null }]
      : [],
  };
}
