import type { Metadata } from "next";
import { storefrontAuthedFetch } from "@/lib/storefrontAuthedFetch";
import type { CartApiEnvelope } from "@/lib/cart-types";
import type { StorefrontMeEnvelope } from "@/lib/checkout-types";
import CheckoutPageClient from "@/components/checkout/CheckoutPageClient";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";

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

export default async function CheckoutPage() {
  const [cartRes, meRes, paymentRes] = await Promise.all([
    storefrontAuthedFetch("/cart"),
    storefrontAuthedFetch("/storefront/customer/me"),
    storefrontAuthedFetch("/storefront/payment-settings"),
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
  return (
    <StorefrontLocaleFrame languageCode={languageCode} className="theme-storefront">
      <CheckoutPageClient
        cartInitial={cartInitial}
        cartStatus={cartRes.status}
        meEnvelope={meEnvelope}
        meStatus={meRes.status}
        paymentEnvelope={paymentEnvelope}
        paymentStatus={paymentRes.status}
        languageCode={languageCode}
      />
    </StorefrontLocaleFrame>
  );
}
