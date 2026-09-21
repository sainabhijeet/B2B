import type { Metadata } from "next";
import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import type { CartApiEnvelope } from "@/lib/cart-types";
import CartPageClient from "@/components/cart/CartPageClient";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";

export const metadata: Metadata = {
  title: "Cart",
  description: "Your shopping cart",
};

export default async function CartPage() {
  const res = await storefrontAuthedFetch("/cart");
  const text = await res.text();
  let initial: CartApiEnvelope = {};
  try {
    initial = JSON.parse(text) as CartApiEnvelope;
  } catch {
    initial = {};
  }
  const languageCode = await getStorefrontLanguage();
  return <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront"><CartPageClient initial={initial} initialStatus={res.status} languageCode={languageCode} /></StorefrontLocaleFrame>;
}
