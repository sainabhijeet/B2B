"use client";

import { useState } from "react";
import type { CartLineItem } from "@/lib/cart-types";
import { emitStorefrontCartChanged } from "@/lib/cart-events";
import { lineSubtotal } from "@/components/cart/cart-client-api";
import { translate } from "@/lib/translation-engine";

type Props = {
  item: CartLineItem;
  languageCode: string;
};

export default function CartItemRow({ item, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const [qty, setQty] = useState(String(item.quantity));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = item.product?.name ?? t("Product");
  const sku = item.variant?.variantSku ?? "—";

  async function saveQty() {
    const n = Number.parseInt(qty, 10);
    if (!Number.isFinite(n) || n < 1) {
      setError(t("Quantity must be at least 1."));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/storefront/cart/items/${encodeURIComponent(item.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: n }),
    });
    const j = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    if (!res.ok) {
      const m = j.message;
      setError(typeof m === "string" ? m : Array.isArray(m) ? m.join(", ") : `${t("Update failed")} (${res.status})`);
      setBusy(false);
      return;
    }
    emitStorefrontCartChanged();
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/storefront/cart/items/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    if (!res.ok) {
      setError(`${t("Remove failed")} (${res.status})`);
      setBusy(false);
      return;
    }
    emitStorefrontCartChanged();
    setBusy(false);
  }

  const sub = lineSubtotal({ ...item, quantity: Number.parseInt(qty, 10) || item.quantity });

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{t("SKU")} {sku}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-600">
          {t("Qty")}
          <input
            className="ml-1 w-16 rounded border border-slate-300 px-2 py-1 text-sm"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveQty()}
          className="rounded bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {t("Update")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void remove()}
          className="text-xs text-red-600 hover:underline disabled:opacity-50"
        >
          {t("Remove")}
        </button>
        <p className="ml-auto text-sm font-semibold text-slate-900">{t("INR")} {sub.toLocaleString(languageCode)}</p>
      </div>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
