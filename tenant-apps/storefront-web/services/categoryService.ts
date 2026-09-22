import { getStorefrontApiBase, storefrontHostHeaderAsync } from "@/lib/storefrontApi";

export type StorefrontCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  level: number;
  parentId: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
};

type StorefrontCategoryItem = {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentId: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
};

type StorefrontCategoriesResponse = {
  success: boolean;
  data: { items: StorefrontCategoryItem[] };
};

function toStorefrontCategory(row: StorefrontCategoryItem): StorefrontCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    level: row.level,
    parentId: row.parentId,
    imageUrl: row.imageUrl || row.thumbnailUrl || null,
    bannerUrl: row.bannerUrl || null,
  };
}

export async function getCategoryBySlug(slug: string): Promise<StorefrontCategory | null> {
  const all = await listCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

/** Tenant + master categories from `GET /storefront/categories`. */
export async function listCategories(): Promise<StorefrontCategory[]> {
  const url = `${getStorefrontApiBase()}/storefront/categories?channel=website`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", ...(await storefrontHostHeaderAsync()) },
      next: { revalidate: 120 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as StorefrontCategoriesResponse;
    if (!body.success || !Array.isArray(body.data?.items)) throw new Error("bad payload");
    if (body.data.items.length === 0) return [];
    return body.data.items.map(toStorefrontCategory);
  } catch {
    return [];
  }
}
