"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { emitStorefrontCartChanged } from "@/lib/cart-events";
import type { PlaceOrderResponse } from "@/lib/checkout-types";
import { translate } from "@/lib/translation-engine";

function formatApiMessage(message: unknown): string {
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.filter((x) => typeof x === "string").join(", ");
  return "";
}

type Props = {
  cartId: string;
  addressId: string | null;
  paymentMode: "CREDIT" | "UPI_QR" | "NEFT" | "CASH";
  couponCode?: string;
  disabled?: boolean;
  languageCode: string;
};

export default function PlaceOrderButton({ cartId, addressId, paymentMode, couponCode, disabled, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function place() {
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = { cartId, paymentMode };
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
      setError(msg ? t(msg) : `${t("Could not place order")} (${res.status}).`);
      setBusy(false);
      return;
    }
    const orderNo = json.data?.order_number;
    if (!orderNo) {
      setError(t("Order created but order number missing in response."));
      setBusy(false);
      return;
    }
    emitStorefrontCartChanged();
    router.push(`/orders/${encodeURIComponent(orderNo)}`);
  }

  return (
    <div>
      {error ? <p className="mb-2 text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        onClick={() => void place()}
        disabled={disabled || busy}
        className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? t("Placing order…") : t("Place order")}
      </button>
    </div>
  );
}
