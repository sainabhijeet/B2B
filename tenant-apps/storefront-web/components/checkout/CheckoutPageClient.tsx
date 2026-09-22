"use client";

import { useState } from "react";
import Link from "next/link";
import type { CartApiEnvelope, CartLineItem } from "@/lib/cart-types";
import type { BuyNowSelection, CheckoutPaymentMode, StorefrontAddress, StorefrontMeEnvelope } from "@/lib/checkout-types";
import CheckoutAddress from "@/components/checkout/CheckoutAddress";
import CheckoutSummary from "@/components/checkout/CheckoutSummary";
import PlaceOrderButton from "@/components/checkout/PlaceOrderButton";
import { translate } from "@/lib/translation-engine";

function pickDefaultAddressId(addresses: StorefrontAddress[] | undefined): string | null {
  if (!addresses?.length) return null;
  const d = addresses.find((a) => a.isDefault);
  return (d ?? addresses[0]).id;
}

type Props = {
  cartInitial: CartApiEnvelope;
  cartStatus: number;
  meEnvelope: StorefrontMeEnvelope;
  meStatus: number;
  paymentEnvelope: PaymentSettingsEnvelope;
  paymentStatus: number;
  languageCode: string;
  buyNow?: BuyNowSelection | null;
  buyNowItem?: CartLineItem | null;
  buyNowRequested?: boolean;
};

type PaymentSettings = {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
};

type PaymentSettingsEnvelope = {
  success?: boolean;
  data?: Partial<PaymentSettings> | null;
};

function paymentSettingsFromEnvelope(envelope: PaymentSettingsEnvelope): PaymentSettings | null {
  const data = envelope.data;
  if (!data || typeof data !== "object") return null;
  const text = (value: unknown) => String(value ?? "").trim();
  const settings = {
    accountHolderName: text(data.accountHolderName),
    bankName: text(data.bankName),
    accountNumber: text(data.accountNumber),
    ifsc: text(data.ifsc),
    branch: text(data.branch),
    upiId: text(data.upiId),
  };
  return settings.upiId || settings.accountNumber ? settings : null;
}

export default function CheckoutPageClient({
  cartInitial,
  cartStatus,
  meEnvelope,
  meStatus,
  paymentEnvelope,
  paymentStatus,
  languageCode,
  buyNow,
  buyNowItem,
  buyNowRequested = false,
}: Props) {
  const t = (text: string) => translate(text, languageCode);
  const items = buyNowItem ? [buyNowItem] : cartInitial.data?.items ?? [];
  const cartId = cartInitial.data?.cart?.id ?? "";
  const me = meEnvelope.data ?? null;
  const paymentSettings = paymentSettingsFromEnvelope(paymentEnvelope);

  const [addresses, setAddresses] = useState<StorefrontAddress[]>(meEnvelope.data?.addresses ?? []);
  const [addressId, setAddressId] = useState<string | null>(() =>
    pickDefaultAddressId(meEnvelope.data?.addresses),
  );
  const [paymentMode, setPaymentMode] = useState<CheckoutPaymentMode>("RAZORPAY");
  const [couponCode, setCouponCode] = useState("");

  if (cartStatus === 401 || cartStatus === 403) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("Checkout")}</h1>
        <p className="mt-3 text-sm text-slate-600">{t("Sign in to review your cart and place an order.")}</p>
        <Link
          href="/login?next=%2Fcheckout"
          className="mt-8 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("Log in")}
        </Link>
      </main>
    );
  }

  if (buyNowRequested && !buyNowItem) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("Buy Now")}</h1>
        <p className="mt-3 text-sm text-slate-600">{t("This product or variant is unavailable. Please return to the product page.")}</p>
        <Link href="/product" className="mt-8 inline-block text-sm font-semibold text-indigo-600 hover:underline">{t("Browse products")}</Link>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("Checkout")}</h1>
        <p className="mt-3 text-sm text-slate-600">{t("Your cart is empty.")}</p>
        <Link href="/product" className="mt-8 inline-block text-sm text-indigo-600 hover:underline">
          {t("Continue shopping")}
        </Link>
      </main>
    );
  }

  const creditLine =
    me?.creditBalance != null && me?.creditLimit != null ? (
      <p className="text-xs text-slate-500">
        {t("Outstanding / limit:")} <span className="font-mono text-slate-700">{me.creditBalance}</span> /{" "}
        <span className="font-mono text-slate-700">{me.creditLimit}</span>
      </p>
    ) : null;

  const meFailed = meStatus !== 200 || !me;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("Checkout")}</h1>
          {me ? (
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{me.name}</span>
            </p>
          ) : null}
          {creditLine}
          {meFailed ? (
            <p className="mt-2 text-xs text-amber-800">
              {t("Could not load account details")} ({meStatus}). {t("Refresh the page before placing an order.")}
            </p>
          ) : null}
        </div>
        <Link href={buyNow ? `/product/${encodeURIComponent(buyNow.productSlug)}` : "/cart"} className="text-sm text-indigo-600 hover:underline">
          {buyNow ? t("Edit selection") : t("Edit cart")}
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <CheckoutAddress
              addresses={addresses}
              value={addressId}
              onChange={(id) => setAddressId(id)}
              onAdded={(address) => {
                setAddresses((current) => [...current, address]);
                setAddressId(address.id);
              }}
                disabled={!cartId && !buyNow}
                languageCode={languageCode}
          />

          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">{t("Payment mode")}</h2>
            <p className="mt-1 text-xs text-slate-500">
              <strong>{t("Online Pay")}</strong> {t("opens secure Razorpay checkout and confirms payment with the server.")} {t("UPI QR and bank transfer require payment proof after order creation.")}
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="radio"
                  name="pay-mode"
                  checked={paymentMode === "RAZORPAY"}
                  onChange={() => setPaymentMode("RAZORPAY")}
                />
                <span><strong>{t("Online Pay")}</strong><span className="ml-2 text-xs text-slate-500">{t("Razorpay · UPI, cards and netbanking")}</span></span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="radio"
                  name="pay-mode"
                  checked={paymentMode === "CREDIT"}
                  onChange={() => setPaymentMode("CREDIT")}
                />
                <span>{t("On account (credit)")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="radio"
                  name="pay-mode"
                  checked={paymentMode === "UPI_QR"}
                  onChange={() => setPaymentMode("UPI_QR")}
                />
                <span>{t("UPI QR")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 p-3 hover:bg-slate-50">
                <input type="radio" name="pay-mode" checked={paymentMode === "NEFT"} onChange={() => setPaymentMode("NEFT")} />
                <span>{t("NEFT / RTGS / IMPS")}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 p-3 hover:bg-slate-50">
                <input type="radio" name="pay-mode" checked={paymentMode === "CASH"} onChange={() => setPaymentMode("CASH")} />
                <span>{t("Cash")}</span>
              </label>
            </div>
            {paymentMode === "UPI_QR" || paymentMode === "NEFT" ? (
              <PaymentDetailsPanel
                settings={paymentSettings}
                status={paymentStatus}
                languageCode={languageCode}
              />
            ) : null}
          </section>
        </div>

        <div className="space-y-4">
          <CheckoutSummary items={items} languageCode={languageCode} />
          <label className="block text-sm font-medium text-slate-800">
            {t("Coupon code")}
            <input
              value={couponCode}
              maxLength={40}
              autoComplete="off"
              onChange={(event) =>
                setCouponCode(event.target.value.replace(/[^a-z0-9_-]/gi, "").toUpperCase())
              }
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
          <PlaceOrderButton
            cartId={cartId}
            buyNow={buyNow}
            addressId={addressId}
            paymentMode={paymentMode}
            couponCode={couponCode}
            disabled={(!cartId && !buyNow) || !addressId}
            languageCode={languageCode}
            customerName={me?.name}
            customerPhone={me?.mobile}
            customerEmail={me?.email}
          />
        </div>
      </div>
    </main>
  );
}

function PaymentDetailsPanel({
  settings,
  status,
  languageCode,
}: {
  settings: PaymentSettings | null;
  status: number;
  languageCode: string;
}) {
  const t = (text: string) => translate(text, languageCode);

  if (!settings) {
    return (
      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        {t("Payment details are not available")} ({status}).
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="mb-3 text-xs font-semibold text-slate-900">{t("Pay by UPI QR or bank transfer")}</p>
      <div className="space-y-2 text-xs text-slate-700">
          <PaymentRow label={t("Account holder")} value={settings.accountHolderName} />
          <PaymentRow label={t("Bank name")} value={settings.bankName} />
          <PaymentRow label={t("Account number")} value={settings.accountNumber} mono />
          <PaymentRow label={t("IFSC")} value={settings.ifsc} mono />
          <PaymentRow label={t("Branch")} value={settings.branch} />
          <PaymentRow label={t("UPI ID")} value={settings.upiId} mono />
      </div>
    </div>
  );
}

function PaymentRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <p className="flex flex-wrap justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</span>
    </p>
  );
}
