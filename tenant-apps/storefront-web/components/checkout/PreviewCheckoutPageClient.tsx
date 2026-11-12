"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearPreviewCart, readPreviewCart, type PreviewCommerceItem } from "@/lib/preview-commerce";
import { formatCurrency } from "@/lib/language-consistency";
import { translate } from "@/lib/translation-engine";

export default function PreviewCheckoutPageClient({ languageCode, buyNowSlug }: { languageCode: string; buyNowSlug?: string }) {
  const [items, setItems] = useState<PreviewCommerceItem[]>([]);
  const [complete, setComplete] = useState(false);
  const t = (value: string) => translate(value, languageCode);
  useEffect(() => {
    const rows = readPreviewCart();
    setItems(buyNowSlug ? rows.filter((item) => item.productSlug === buyNowSlug) : rows);
  }, [buyNowSlug]);
  const subtotal = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);

  if (complete) {
    return (
      <main className="storefront-checkout-page mx-auto min-h-[70vh] max-w-xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10">
          <h1 className="text-2xl font-bold text-emerald-950">{t("Order placed successfully")}</h1>
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">{t("Continue shopping")}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="storefront-checkout-page mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-950">{t("Checkout")}</h1>
      {items.length === 0 ? <p className="mt-8 rounded-xl border border-slate-200 bg-white p-8">{t("Your cart is empty.")}</p> : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <form id="checkout-form" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (!buyNowSlug) clearPreviewCart(); setComplete(true); }}>
            <label className="text-sm font-semibold text-slate-700">{t("Full name")}<input required className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700">{t("Phone")}<input required type="tel" className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" /></label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">{t("Delivery address")}<textarea required className="mt-1.5 min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" /></label>
          </form>
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-950">{t("Order summary")}</h2>
            <div className="mt-4 space-y-3">{items.map((item) => <div key={`${item.productId}:${item.variantId}`} className="flex justify-between gap-3 text-sm"><span>{t(item.productName)} × {item.quantity}</span><span className="font-semibold">{formatCurrency((item.price ?? 0) * item.quantity, languageCode, item.currency)}</span></div>)}</div>
            <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-lg font-bold"><span>{t("Total")}</span><span>{formatCurrency(subtotal, languageCode)}</span></div>
            <button form="checkout-form" type="submit" className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">{t("Place order")}</button>
          </aside>
        </div>
      )}
    </main>
  );
}
