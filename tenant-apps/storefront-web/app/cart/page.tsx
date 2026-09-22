import type { Metadata } from "next";
import { storefrontAuthedFetchReadOnly } from "@/lib/storefrontAuthedFetch";
import RefreshCustomerSession from "@/components/auth/RefreshCustomerSession";
import type { CartApiEnvelope } from "@/lib/cart-types";
import CartPageClient from "@/components/cart/CartPageClient";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";

export const metadata: Metadata = {
  title: "Cart",
  description: "Your shopping cart",
};

export default async function CartPage() {
  const res = await storefrontAuthedFetchReadOnly("/cart");
  const text = await res.text();
  let initial: CartApiEnvelope = {};
  try {
    initial = JSON.parse(text) as CartApiEnvelope;
  } catch {
    initial = {};
  }
  const languageCode = await getStorefrontLanguage();
  const content = <CartPageClient initial={initial} initialStatus={res.status} languageCode={languageCode} />;
  return <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront">{res.status === 401 ? <RefreshCustomerSession>{content}</RefreshCustomerSession> : content}</StorefrontLocaleFrame>;
}
