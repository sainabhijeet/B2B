import { getStorefrontApiBase, storefrontHostHeaderAsync } from "@/lib/storefrontApi";
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";

export type StorefrontProduct = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  price: number | null;
  mrp?: number | null;
  compareAtPrice?: number | null;
  currency: string;
  image?: string;
  brand?: string | null;
  categoryName?: string | null;
  sku?: string | null;
  stock?: number | null;
  stockQuantity?: number | null;
  moq?: number | null;
  unit?: string | null;
  packSize?: string | null;
  gstRate?: string | number | null;
  badge?: string | null;
  leadTime?: string | null;
  features?: string[] | null;
  rating?: number | null;
  reviewCount?: number | null;
  attributes?: Record<string, string | number | boolean | null | undefined> | null;
};

export type StorefrontListParams = {
  category?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  brand?: string;
  sort?: "price_asc" | "price_desc" | "newest" | "best_selling";
  page?: number;
  limit?: number;
} & Record<string, string | number | boolean | undefined>;

type StorefrontApiItem = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: string | null;
  mrp?: string | number | null;
  brand?: string | null;
  brandName?: string | null;
  categorySlug: string | null;
  category?: { id?: string; name?: string | null; slug?: string | null } | null;
  imageUrl?: string | null;
  thumbnailUrl: string | null;
  description?: string | null;
  unit?: string | null;
  packSize?: string | null;
  moq?: number | null;
  stockQuantity?: number | null;
  gstRate?: string | number | null;
  variants?: Array<{
    attributes?: Record<string, string | number | boolean | null | undefined> | null;
  }>;
};

type StorefrontListResponse = {
  success: boolean;
  data: {
    items: StorefrontApiItem[];
    filters: Record<string, { slug: string; value: string; count: number }[]>;
    meta: { page: number; limit: number; total: number; total_pages: number };
  };
};

function toStorefrontProduct(row: StorefrontApiItem): StorefrontProduct {
  const price = row.price == null ? NaN : Number.parseFloat(row.price);
  const mrp = row.mrp == null ? NaN : Number(row.mrp);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description?.trim() ?? "",
    price: Number.isFinite(price) ? price : null,
    mrp: Number.isFinite(mrp) ? mrp : null,
    currency: "INR",
    image: row.thumbnailUrl ?? row.imageUrl ?? undefined,
    brand: row.brandName ?? row.brand ?? null,
    categoryName: row.category?.name ?? null,
    sku: row.sku ?? null,
    stockQuantity: row.stockQuantity ?? null,
    moq: row.moq ?? null,
    unit: row.unit ?? null,
    packSize: row.packSize ?? null,
    gstRate: row.gstRate ?? null,
    attributes: row.variants?.[0]?.attributes ?? null,
  };
}

export type StorefrontProductDetail = {
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    description: string;
    brand: string | null;
    categorySlug: string | null;
    categoryName?: string | null;
    hsnCode?: string | null;
    barcode?: string | null;
    weight?: string | null;
    dimensions?: string | null;
    tags?: string[];
  };
  variants: {
    id: string;
    sku: string;
    listPrice: string | null;
    mrp: string | null;
    price: string | null;
    priceBaseSource: string | null;
    quantityTierApplied: boolean | null;
    stockQuantity?: number | null;
    moq?: number;
    gstRate?: string | null;
    attributesJson?: Record<string, unknown>;
    priceSlabs?: { minQty: number; price: string; label?: string }[];
  }[];
  images: { id: string; url: string; isThumbnail: boolean; variantId: string | null }[];
};

/**
 * PDP: `GET /storefront/products/:slug` — pass retailer `Authorization: Bearer` for customer/group pricing.
 */
export async function fetchStorefrontProductDetail(
  slug: string,
  opts?: { accessToken?: string; qty?: number },
): Promise<StorefrontProductDetail | null> {
  const qs = opts?.qty != null && !Number.isNaN(opts.qty) ? `?qty=${encodeURIComponent(String(opts.qty))}` : "";
  const url = `${getStorefrontApiBase()}/storefront/products/${encodeURIComponent(slug)}${qs}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(await storefrontHostHeaderAsync()),
  };
  if (opts?.accessToken) headers.Authorization = `Bearer ${opts.accessToken}`;
  try {
    let res = await fetch(url, { headers, cache: "no-store" });
    if (res.status === 401 && opts?.accessToken) {
      delete headers.Authorization;
      res = await fetch(url, { headers, cache: "no-store" });
    }
    if (!res.ok) return null;
    const body = (await res.json()) as { success: boolean; data: StorefrontProductDetail };
    if (!body.success || !body.data) return null;
    return body.data;
  } catch {
    return null;
  }
}

/** @deprecated prefer fetchStorefrontProductDetail or listStorefrontProducts */
export async function getProductBySlug(slug: string): Promise<StorefrontProduct | null> {
  const detail = await fetchStorefrontProductDetail(slug);
  if (detail) {
    const v0 = detail.variants[0];
    const p = Number.parseFloat(v0?.price ?? "0");
    return {
      id: detail.product.id,
      slug: detail.product.slug,
      name: detail.product.name,
      description: detail.product.description,
      price: Number.isFinite(p) ? p : 0,
      currency: "INR",
      image: detail.images[0]?.url,
    };
  }
  const { products } = await listStorefrontProducts({ limit: 200 });
  return products.find((p) => p.slug === slug) ?? null;
}

/**
 * Shopify-style catalog list: `GET /storefront/products` with facet query params.
 * Returns an empty catalog if the API is unavailable; production never fabricates products.
 */
export async function listStorefrontProducts(params: StorefrontListParams = {}): Promise<{
  products: StorefrontProduct[];
  filters: StorefrontListResponse["data"]["filters"];
  meta: StorefrontListResponse["data"]["meta"];
}> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, String(v));
  }
  const qs = q.toString();
  const url = `${getStorefrontApiBase()}/storefront/products${qs ? `?${qs}` : ""}`;
  try {
    const { cookies } = await import("next/headers");
    const token = (await cookies()).get(CUSTOMER_ACCESS_COOKIE)?.value;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(await storefrontHostHeaderAsync()),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    let res = await fetch(url, { headers, cache: "no-store" });
    if (res.status === 401 && token) {
      delete headers.Authorization;
      res = await fetch(url, { headers, cache: "no-store" });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as StorefrontListResponse;
    if (!body.success || !body.data) throw new Error("bad payload");
    return {
      products: body.data.items.map(toStorefrontProduct),
      filters: body.data.filters,
      meta: body.data.meta,
    };
  } catch {
    return {
      products: [],
      filters: {},
      meta: { page: 1, limit: Number(params.limit ?? 24), total: 0, total_pages: 0 },
    };
  }
}

export async function listProducts(params?: StorefrontListParams): Promise<StorefrontProduct[]> {
  const { products } = await listStorefrontProducts(params);
  return products;
}
