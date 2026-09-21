export const STOREFRONT_CART_CHANGED = "storefront:cart-changed";

export function emitStorefrontCartChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STOREFRONT_CART_CHANGED));
}
