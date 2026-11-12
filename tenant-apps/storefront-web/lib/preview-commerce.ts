export const PREVIEW_CART_KEY = "storefront_theme_preview_cart_v2";
export const PREVIEW_WISHLIST_KEY = "storefront_theme_preview_wishlist_v2";
export const PREVIEW_COMMERCE_CHANGED = "storefront:preview-commerce-changed";

export type PreviewCommerceItem = {
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  sku: string;
  quantity: number;
  price: number | null;
  currency: string;
  image?: string;
  brand?: string | null;
};

function scopedKey(key: string): string {
  if (typeof window === "undefined") return key;
  const params = new URLSearchParams(window.location.search);
  const tenant = params.get("tenantId")?.trim() || params.get("tenant")?.trim() || window.location.host;
  return `${key}:${tenant.toLowerCase()}`;
}

function readRows(key: string): PreviewCommerceItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(scopedKey(key)) ?? "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((row): row is PreviewCommerceItem => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return false;
      const item = row as Partial<PreviewCommerceItem>;
      return typeof item.productId === "string" && typeof item.productSlug === "string" && typeof item.productName === "string";
    });
  } catch {
    return [];
  }
}

function writeRows(key: string, rows: PreviewCommerceItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(scopedKey(key), JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent(PREVIEW_COMMERCE_CHANGED));
}

export function isPreviewCommerceLocation(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const demoCatalog = document.body?.dataset.catalogPresentation === "demo";
  return demoCatalog || params.get("previewMode") === "1" || params.has("wbPreview");
}

export function readPreviewCart(): PreviewCommerceItem[] {
  return readRows(PREVIEW_CART_KEY);
}

export function upsertPreviewCart(item: PreviewCommerceItem): PreviewCommerceItem[] {
  const rows = readPreviewCart();
  const index = rows.findIndex((row) => row.productId === item.productId && row.variantId === item.variantId);
  if (index >= 0) rows[index] = item;
  else rows.push(item);
  writeRows(PREVIEW_CART_KEY, rows);
  return rows;
}

export function removePreviewCartItem(productId: string, variantId: string): PreviewCommerceItem[] {
  const rows = readPreviewCart().filter((row) => row.productId !== productId || row.variantId !== variantId);
  writeRows(PREVIEW_CART_KEY, rows);
  return rows;
}

export function clearPreviewCart(): void {
  writeRows(PREVIEW_CART_KEY, []);
}

export function readPreviewWishlist(): PreviewCommerceItem[] {
  return readRows(PREVIEW_WISHLIST_KEY);
}

export function togglePreviewWishlist(item: PreviewCommerceItem): { saved: boolean; items: PreviewCommerceItem[] } {
  const rows = readPreviewWishlist();
  const exists = rows.some((row) => row.productId === item.productId);
  const items = exists ? rows.filter((row) => row.productId !== item.productId) : [...rows, item];
  writeRows(PREVIEW_WISHLIST_KEY, items);
  return { saved: !exists, items };
}
