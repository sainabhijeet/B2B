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

export default function CartPageClient({ initial, initialStatus, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const [items, setItems] = useState<CartLineItem[]>(initial.data?.items ?? []);
  const [loading, setLoading] = useState(false);

  const sync = useCallback(async () => {
    setLoading(true);
    const { res, body } = await getCartEnvelope();
    if (res.ok) setItems(body.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const on = () => void sync();
    window.addEventListener(STOREFRONT_CART_CHANGED, on);
    return () => window.removeEventListener(STOREFRONT_CART_CHANGED, on);
  }, [sync]);

  if (initialStatus === 401 || initialStatus === 403) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">{t("Your cart")}</h1>
        <p className="mt-3 text-sm text-slate-600">{t("Sign in to view and manage your cart.")}</p>
        <Link
          href="/login"
          className="mt-8 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t("Log in")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">{t("Your cart")}</h1>
        <Link href="/product" className="text-sm text-indigo-600 hover:underline">
          {t("Continue shopping")}
        </Link>
      </div>
      {loading ? <p className="mt-4 text-xs text-slate-500">{t("Updating…")}</p> : null}
      {items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-600">{t("Your cart is empty.")}</p>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {items.map((it) => (
              <CartItemRow key={it.id} item={it} languageCode={languageCode} />
            ))}
          </div>
          <CartSummary items={items} languageCode={languageCode} />
          <Link
            href="/checkout"
            className="block w-full rounded-lg bg-indigo-600 py-3 text-center text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {t("Checkout")}
          </Link>
        </div>
      )}
    </main>
  );
}
