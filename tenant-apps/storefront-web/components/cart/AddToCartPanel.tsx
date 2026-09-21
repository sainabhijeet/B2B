"use client";

import { useState } from "react";
import { emitStorefrontCartChanged } from "@/lib/cart-events";
import { translate } from "@/lib/translation-engine";

export type VariantOption = { id: string; sku: string; price: string };

type Props = {
  productId: string;
  productName: string;
  languageCode?: string;
  variants: VariantOption[];
};

export default function AddToCartPanel({ productId, productName, languageCode, variants }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/storefront/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        ...(variantId ? { variantId } : {}),
        quantity: qty,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    if (!res.ok) {
      const m = j.message;
      setMsg(typeof m === "string" ? m : Array.isArray(m) ? m.join(", ") : `Could not add (${res.status})`);
      setBusy(false);
      return;
    }
    setMsg(`${t("Added")} "${t(productName)}" ${t("to cart.")}`);
    emitStorefrontCartChanged();
    setBusy(false);
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("Order")}</p>
      {variants.length > 1 ? (
        <label className="mt-2 block text-xs text-slate-600">
          {t("Variant")}
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.sku} — ₹{Number.parseFloat(v.price).toLocaleString("en-IN")}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="mt-3 block text-xs text-slate-600">
        {t("Quantity")}
        <input
          type="number"
          min={1}
          className="mt-1 w-28 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void add()}
        className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? t("Adding...") : t("Add to cart")}
      </button>
      {msg ? <p className="mt-2 text-xs text-slate-700">{msg}</p> : null}
      <p className="mt-2 text-[11px] text-slate-500">{t("Requires retailer login; stock is checked on the server.")}</p>
    </div>
  );
}
