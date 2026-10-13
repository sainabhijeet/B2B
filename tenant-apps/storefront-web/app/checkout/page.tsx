import type { Metadata } from "next";
import { storefrontAuthedFetchReadOnly } from "@/lib/storefrontAuthedFetch";
import RefreshCustomerSession from "@/components/auth/RefreshCustomerSession";
import type { CartApiEnvelope } from "@/lib/cart-types";
import type { CartLineItem } from "@/lib/cart-types";
import type { BuyNowSelection } from "@/lib/checkout-types";
import type { StorefrontMeEnvelope } from "@/lib/checkout-types";
import CheckoutPageClient from "@/components/checkout/CheckoutPageClient";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { cookies } from "next/headers";
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";
import { fetchStorefrontProductDetail } from "@/services/productService";
import { getStorefrontFeatureConfig } from "@/services/storefrontAppConfigService";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Place your order",
};

type PaymentSettingsEnvelope = {
  success?: boolean;
  data?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    branch?: string;
    upiId?: string;
  } | null;
};

type Search = Promise<{ buyNow?: string | string[]; variantId?: string | string[]; qty?: string | string[] }>;

export default async function CheckoutPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const buyNowSlug = first(sp.buyNow)?.trim() ?? "";
  const variantId = first(sp.variantId)?.trim() ?? "";
  const quantity = Number.parseInt(first(sp.qty) ?? "", 10);
  let buyNow: BuyNowSelection | null = null;
  let buyNowItem: CartLineItem | null = null;
  if (buyNowSlug && variantId && Number.isInteger(quantity) && quantity > 0 && quantity <= 999999) {
    const token = (await cookies()).get(CUSTOMER_ACCESS_COOKIE)?.value;
    const detail = await fetchStorefrontProductDetail(buyNowSlug, token ? { accessToken: token, qty: quantity } : { qty: quantity });
    const variant = detail?.variants.find((row) => row.id === variantId);
    const price = variant?.price == null ? NaN : Number(variant.price);
    const minimum = Math.max(1, variant?.moq ?? 1);
    if (detail && variant && Number.isFinite(price) && quantity >= minimum && (variant.stockQuantity == null || quantity <= variant.stockQuantity)) {
      buyNow = { productId: detail.product.id, variantId, quantity, productSlug: buyNowSlug };
      buyNowItem = {
        id: `buy-now-${variantId}`,
        productId: detail.product.id,
        variantId,
        quantity,
        priceSnapshot: String(price),
        taxRate: variant.gstRate ?? undefined,
        product: { id: detail.product.id, name: detail.product.name, slug: detail.product.slug },
        variant: { id: variant.id, variantSku: variant.sku },
      };
    }
  }
  const [cartRes, meRes, paymentRes, featureConfig] = await Promise.all([
    storefrontAuthedFetchReadOnly("/cart"),
    storefrontAuthedFetchReadOnly("/storefront/customer/me"),
    storefrontAuthedFetchReadOnly("/storefront/payment-settings"),
    getStorefrontFeatureConfig(),
  ]);

  const cartText = await cartRes.text();
  let cartInitial: CartApiEnvelope = {};
  try {
    cartInitial = JSON.parse(cartText) as CartApiEnvelope;
  } catch {
    cartInitial = {};
  }

  const meText = await meRes.text();
  let meEnvelope: StorefrontMeEnvelope = {};
  try {
    meEnvelope = JSON.parse(meText) as StorefrontMeEnvelope;
  } catch {
    meEnvelope = {};
  }

  const paymentText = await paymentRes.text();
  let paymentEnvelope: PaymentSettingsEnvelope = {};
  try {
    paymentEnvelope = JSON.parse(paymentText) as PaymentSettingsEnvelope;
  } catch {
    paymentEnvelope = {};
  }

  const languageCode = await getStorefrontLanguage();
  const content = <CheckoutPageClient
        cartInitial={cartInitial}
        cartStatus={cartRes.status}
        meEnvelope={meEnvelope}
        meStatus={meRes.status}
        paymentEnvelope={paymentEnvelope}
        paymentStatus={paymentRes.status}
        creditViewEnabled={featureConfig.creditViewEnabled}
        languageCode={languageCode}
        buyNow={buyNow}
        buyNowItem={buyNowItem}
        buyNowRequested={Boolean(buyNowSlug)}
      />;
  return (
    <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront">
      {cartRes.status === 401 || meRes.status === 401 ? <RefreshCustomerSession>{content}</RefreshCustomerSession> : content}
    </StorefrontLocaleFrame>
  );
}
