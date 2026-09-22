"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { STOREFRONT_CART_CHANGED } from "@/lib/cart-events";
import type { CartApiEnvelope, CartLineItem } from "@/lib/cart-types";
import CartItemRow from "@/components/cart/CartItemRow";
import CartSummary from "@/components/cart/CartSummary";
import { getCartEnvelope } from "@/components/cart/cart-client-api";
import { translate } from "@/lib/translation-engine";

type Props = {
  initial: CartApiEnvelope;
  initialStatus: number;
  languageCode: string;
};

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-8 w-8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="10" cy="20" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function CartPageClient({ initial, initialStatus, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const [items, setItems] = useState<CartLineItem[]>(initial.data?.items ?? []);
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const sync = useCallback(async () => {
    setLoading(true);
    setNetworkError(false);
    try {
      const { res, body } = await getCartEnvelope();
      setStatus(res.status);
      if (res.ok) setItems(body.data?.items ?? []);
    } catch {
      setNetworkError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const on = () => void sync();
    window.addEventListener(STOREFRONT_CART_CHANGED, on);
    return () => window.removeEventListener(STOREFRONT_CART_CHANGED, on);
  }, [sync]);

  if (status === 401 || status === 403) {
    return (
      <main className="min-h-[calc(100vh-12rem)] bg-slate-50 px-4 py-16">
        <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700"><CartIcon /></div>
          <h1 className="mt-5 text-2xl font-bold text-slate-950">{t("Your cart")}</h1>
          <p className="mt-3 text-sm text-slate-600">{t("Sign in to view and manage your cart.")}</p>
          <Link href="/login?next=%2Fcart" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--theme-primary)] px-6 text-sm font-bold text-white hover:brightness-95">
            {t("Log in")}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-12rem)] bg-slate-50 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t("Your cart")}</h1>
            {items.length > 0 ? <p className="mt-2 text-sm text-slate-600">{items.length} {t(items.length === 1 ? "product" : "products")} · {totalUnits} {t(totalUnits === 1 ? "unit" : "units")}</p> : null}
          </div>
          <Link href="/product" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-primary)] hover:underline">
            <span aria-hidden="true">←</span> {t("Continue shopping")}
          </Link>
        </div>

        {loading ? <p role="status" className="mt-4 text-sm text-slate-500">{t("Updating…")}</p> : null}
        {networkError || (status >= 400 && status !== 401 && status !== 403) ? (
          <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{t("Could not load your cart. Please try again.")}</span>
            <button type="button" onClick={() => void sync()} disabled={loading} className="font-bold underline disabled:opacity-50">{t("Retry")}</button>
          </div>
        ) : null}

        {status < 400 && items.length === 0 ? (
          <section className="mx-auto mt-10 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700"><CartIcon /></div>
            <h2 className="mt-5 text-xl font-bold text-slate-950">{t("Your cart is empty.")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("Explore products and add the items you need.")}</p>
            <Link href="/product" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--theme-primary)] px-6 text-sm font-bold text-white hover:brightness-95">
              {t("Browse products")}
            </Link>
          </section>
        ) : items.length > 0 ? (
          <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section aria-label={t("Cart products")} className="space-y-4">
              {items.map((item) => <CartItemRow key={item.id} item={item} languageCode={languageCode} />)}
            </section>
            <div className="lg:sticky lg:top-32">
              <CartSummary items={items} languageCode={languageCode} />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
