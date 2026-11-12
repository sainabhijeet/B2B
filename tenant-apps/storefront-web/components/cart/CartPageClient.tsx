"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { STOREFRONT_CART_CHANGED } from "@/lib/cart-events";
import type { CartApiEnvelope, CartLineItem } from "@/lib/cart-types";
import CartItemRow from "@/components/cart/CartItemRow";
import CartSummary from "@/components/cart/CartSummary";
import { getCartEnvelope } from "@/components/cart/cart-client-api";
import { translate } from "@/lib/translation-engine";
import CartEmptyWorkspace from "@/components/cart/CartEmptyWorkspace";

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
      <main className="storefront-cart-page min-h-[calc(100vh-12rem)] bg-slate-50 px-4 py-16">
        <section className="cart-empty-state mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
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
    <main className="storefront-cart-page min-h-[calc(100vh-12rem)] bg-[#eef4f6] pb-16 text-[#08283d]">
      <div className="cart-page-inner mx-auto max-w-[1320px] px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <header className="cart-page-intro flex flex-wrap items-end justify-between gap-6 border-b border-[#bdd3dc] pb-7">
          <div>
            <span className="cart-theme-eyebrow text-[10px] font-black uppercase tracking-[0.2em] text-[#0879ad]">{t("Trade order workspace")}</span>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#08283d]">{t("Your cart")}</h1>
            {items.length > 0 ? <p className="mt-2 text-sm text-slate-600">{items.length} {t(items.length === 1 ? "product" : "products")} · {totalUnits} {t(totalUnits === 1 ? "unit" : "units")}</p> : null}
          </div>
          <Link href="/category" className="cart-continue-link inline-flex min-h-11 items-center gap-3 border border-[#9fc4d2] bg-white px-5 text-xs font-black uppercase tracking-[0.08em] text-[#062f45] transition hover:border-[#0879ad]">
            <span aria-hidden="true">←</span> {t("Continue shopping")}
          </Link>
        </header>

        {loading ? <p role="status" className="mt-4 text-sm text-slate-500">{t("Updating…")}</p> : null}
        {networkError || (status >= 400 && status !== 401 && status !== 403) ? (
          <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{t("Could not load your cart. Please try again.")}</span>
            <button type="button" onClick={() => void sync()} disabled={loading} className="font-bold underline disabled:opacity-50">{t("Retry")}</button>
          </div>
        ) : null}

        {status < 400 && items.length === 0 ? (
          <CartEmptyWorkspace languageCode={languageCode} />
        ) : items.length > 0 ? (
          <>
          <div className="cart-layout mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section aria-label={t("Cart products")} className="cart-items-panel border border-[#b8d1da] bg-white p-4 shadow-[0_18px_45px_rgba(6,47,69,0.07)] sm:p-6">
              <div className="cart-list-heading mb-2 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">{t("Selected materials")}</span>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">{t("Order list")}</h2>
                </div>
                <span className="cart-unit-count rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{totalUnits} {t(totalUnits === 1 ? "unit" : "units")}</span>
              </div>
              <div className="cart-items-list divide-y divide-slate-100">
                {items.map((item) => <CartItemRow key={item.id} item={item} languageCode={languageCode} />)}
              </div>
            </section>
            <div className="cart-summary-column lg:sticky lg:top-32">
              <CartSummary items={items} languageCode={languageCode} />
            </div>
          </div>
          <section className="cart-service-strip cart-theme-only mt-7 hidden grid-cols-1 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-3">
            <div><strong>{t("Secure checkout")}</strong><span>{t("Protected account and payment flow")}</span></div>
            <div><strong>{t("Trade-ready ordering")}</strong><span>{t("Quantities remain editable before checkout")}</span></div>
            <div><strong>{t("Buyer support")}</strong><span>{t("Talk to the buying desk for bulk requirements")}</span></div>
          </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
