"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { emitStorefrontCartChanged } from "@/lib/cart-events";
import type { BuyNowSelection, CheckoutPaymentMode, PlaceOrderResponse } from "@/lib/checkout-types";
import { loadRazorpayCheckout, payWithRazorpay, RazorpayCheckoutError } from "@/lib/razorpay-checkout";
import { translate } from "@/lib/translation-engine";

function formatApiMessage(message: unknown): string {
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.filter((x) => typeof x === "string").join(", ");
  return "";
}

type Props = {
  cartId?: string;
  buyNow?: BuyNowSelection | null;
  addressId: string | null;
  paymentMode: CheckoutPaymentMode;
  couponCode?: string;
  disabled?: boolean;
  languageCode: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
};

export default function PlaceOrderButton({ cartId, buyNow, addressId, paymentMode, couponCode, disabled, languageCode, customerName, customerPhone, customerEmail }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);

  async function place() {
    if (busy || pendingOrder) return;
    setBusy(true);
    setError(null);
    let navigating = false;
    try {
      if (paymentMode === "RAZORPAY") {
        if (!customerPhone?.trim()) throw new Error("Add a mobile number to your Profile before paying online.");
        // Load the gateway before reserving stock and creating an order.
        await loadRazorpayCheckout();
      }
      const body: Record<string, unknown> = buyNow
        ? { buyNow: { productId: buyNow.productId, variantId: buyNow.variantId, quantity: buyNow.quantity }, paymentMode }
        : { cartId, paymentMode };
      if (addressId) body.addressId = addressId;
      if (couponCode?.trim()) body.couponCode = couponCode.trim().toUpperCase();
      const res = await fetch("/api/storefront/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as PlaceOrderResponse;
      if (!res.ok) {
        const msg = formatApiMessage(json.message);
        throw new Error(msg || `${t("Could not place order")} (${res.status}).`);
      }
      const orderNo = json.data?.order_number;
      const orderId = json.data?.order_id;
      if (!orderNo || !orderId) throw new Error("Order created, but its details are missing. Check Orders before trying again.");
      const detailPath = `/orders/${encodeURIComponent(orderNo)}`;
      if (paymentMode === "RAZORPAY") {
        try {
          const result = await payWithRazorpay({ orderId, orderNumber: orderNo, customerName, customerPhone, customerEmail });
          if (result.status === "verified") {
            if (!buyNow) emitStorefrontCartChanged();
            navigating = true;
            router.push(detailPath);
            return;
          }
          if (result.status === "cancelled") {
            const abandoned = await fetch(`/api/storefront/orders/${encodeURIComponent(orderId)}/razorpay/abandon`, { method: "POST" });
            if (abandoned.ok) {
              setError(t("Online payment was cancelled. Your cart is unchanged."));
              return;
            }
            const payload = (await abandoned.json().catch(() => null)) as { message?: string | string[] } | null;
            setError(formatApiMessage(payload?.message) || "Payment status needs attention. Check Orders before trying again.");
          } else {
            setError(result.message);
          }
          setPendingOrder(detailPath);
          return;
        } catch (paymentError) {
          if (paymentError instanceof RazorpayCheckoutError && paymentError.paymentMayHaveSucceeded) {
            setError(paymentError.message);
          } else {
            // The backend checks Razorpay for authorized/captured payments before cancellation.
            const abandoned = await fetch(`/api/storefront/orders/${encodeURIComponent(orderId)}/razorpay/abandon`, { method: "POST" }).catch(() => null);
            if (abandoned?.ok) {
              setError(paymentError instanceof Error ? paymentError.message : "Unable to open Online Pay. Please try again.");
              return;
            }
            setError("Payment status needs attention. Check Orders before trying again.");
          }
          setPendingOrder(detailPath);
          return;
        }
      }
      if (!buyNow) emitStorefrontCartChanged();
      navigating = true;
      router.push(detailPath);
    } catch (placeError) {
      setError(placeError instanceof Error ? t(placeError.message) : t("Could not place order."));
    } finally {
      if (!navigating) setBusy(false);
    }
  }

  return (
    <div>
      {error ? <p className="mb-2 text-sm text-red-700" role="alert">{error}</p> : null}
      {pendingOrder ? <Link href={pendingOrder} className="mb-3 inline-block text-sm font-semibold text-indigo-700 underline">{t("View order and retry payment")}</Link> : null}
      <button
        type="button"
        onClick={() => void place()}
        disabled={disabled || busy || Boolean(pendingOrder)}
        className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? t(paymentMode === "RAZORPAY" ? "Opening Online Pay…" : "Placing order…") : t(paymentMode === "RAZORPAY" ? "Pay Online" : "Place order")}
      </button>
    </div>
  );
}
