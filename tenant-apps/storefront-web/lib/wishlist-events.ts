export const STOREFRONT_WISHLIST_CHANGED = "storefront:wishlist-changed";

export type StorefrontWishlistChangedDetail = {
  count?: number;
  productIds?: string[];
};

export function emitStorefrontWishlistChanged(productIds?: string[]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<StorefrontWishlistChangedDetail>(STOREFRONT_WISHLIST_CHANGED, {
    detail: {
      productIds,
      count: productIds?.length,
    },
  }));
}
