import type { Metadata } from "next";
import { storefrontAuthedFetchReadOnly } from "@/lib/storefrontAuthedFetch";
import RefreshCustomerSession from "@/components/auth/RefreshCustomerSession";
import type { CartApiEnvelope } from "@/lib/cart-types";
import CartPageClient from "@/components/cart/CartPageClient";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import CoatCraftPreviewCartPageClient from "@/components/cart/CoatCraftPreviewCartPageClient";
import PreviewCartPageClient from "@/components/cart/PreviewCartPageClient";
import { isDemoCatalog, resolveStorefrontTheme } from "@/lib/resolve-storefront-theme";

export const metadata: Metadata = {
  title: "Cart",
  description: "Your shopping cart",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function CartPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const previewMode = (Array.isArray(sp.previewMode) ? sp.previewMode[0] : sp.previewMode) === "1";
  const languageCode = await getStorefrontLanguage();
  const resolved = await resolveStorefrontTheme();
  if (previewMode || (resolved && isDemoCatalog(resolved))) {
    if (resolved.storefrontKey === "paints-coatings-adhesives-web-theme") {
      return <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront"><CoatCraftPreviewCartPageClient languageCode={languageCode} /></StorefrontLocaleFrame>;
    }
    const variant = resolved.storefrontKey === "chemicals-specialty-materials-web-theme" ? "material-dossier" : "default";
    return <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront"><PreviewCartPageClient languageCode={languageCode} variant={variant} /></StorefrontLocaleFrame>;
  }
  const res = await storefrontAuthedFetchReadOnly("/cart");
  const text = await res.text();
  let initial: CartApiEnvelope = {};
  try {
    initial = JSON.parse(text) as CartApiEnvelope;
  } catch {
    initial = {};
  }
  const content = <CartPageClient initial={initial} initialStatus={res.status} languageCode={languageCode} />;
  return <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront">{res.status === 401 ? <RefreshCustomerSession>{content}</RefreshCustomerSession> : content}</StorefrontLocaleFrame>;
}
