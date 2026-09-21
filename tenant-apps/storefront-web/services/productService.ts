import { getStorefrontApiBase, storefrontHostHeaderAsync } from "@/lib/storefrontApi";

export type StorefrontProduct = {
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image?: string;
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
  price: string;
  categorySlug: string | null;
  thumbnailUrl: string | null;
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
  const price = Number.parseFloat(row.price);
  return {
    slug: row.slug,
    name: row.name,
    description: "",
    price: Number.isFinite(price) ? price : 0,
    currency: "INR",
    image: row.thumbnailUrl ?? undefined,
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
  };
  variants: {
    id: string;
    sku: string;
    listPrice: string;
    mrp: string;
    price: string;
    priceBaseSource: string;
    quantityTierApplied: boolean;
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
    const res = await fetch(url, { headers, next: { revalidate: 30 } });
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
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(await storefrontHostHeaderAsync()),
      },
      next: { revalidate: 60 },
    });
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
