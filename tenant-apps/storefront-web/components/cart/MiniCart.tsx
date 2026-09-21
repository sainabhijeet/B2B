"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { STOREFRONT_CART_CHANGED } from "@/lib/cart-events";
import type { CartLineItem } from "@/lib/cart-types";
import { getCartEnvelope, lineSubtotal } from "@/components/cart/cart-client-api";
import { translate } from "@/lib/translation-engine";

export default function MiniCart({ languageCode }: { languageCode?: string }) {
  const t = (text: string) => translate(text, languageCode);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { res, body } = await getCartEnvelope();
    if (res.status === 401 || res.status === 403) {
      setAuthed(false);
      setItems([]);
      setLoading(false);
      return;
    }
    setAuthed(true);
    setItems(body.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => void load();
    window.addEventListener(STOREFRONT_CART_CHANGED, onChange);
    return () => window.removeEventListener(STOREFRONT_CART_CHANGED, onChange);
  }, [load]);

  const count = items.reduce((n, it) => n + it.quantity, 0);
  const subtotal = items.reduce((s, it) => s + lineSubtotal(it), 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {t("Cart")}
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-black/20" aria-label={t("Close cart")} onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
            <p className="text-xs font-semibold text-slate-900">{t("Your cart")}</p>
            {loading ? <p className="mt-2 text-xs text-slate-500">{t("Loading")}...</p> : null}
            {!loading && authed === false ? (
              <p className="mt-2 text-xs text-slate-600">
                <Link href="/login" className="font-medium text-indigo-600 hover:underline" onClick={() => setOpen(false)}>
                  {t("Sign in")}
                </Link>{" "}
                {t("to use your cart.")}
              </p>
            ) : null}
            {!loading && authed && items.length === 0 ? <p className="mt-2 text-xs text-slate-600">{t("Cart is empty.")}</p> : null}
            {!loading && authed && items.length > 0 ? (
              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between gap-2 text-xs">
                    <span className="truncate text-slate-800">{t(it.product?.name ?? "Item")}</span>
                    <span className="shrink-0 text-slate-600">
                      x{it.quantity} - {t("INR")} {lineSubtotal(it).toLocaleString(languageCode)}
                    </span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-xs font-semibold text-slate-900">
                  <span>{t("Subtotal")}</span>
                  <span>{t("INR")} {subtotal.toLocaleString(languageCode)}</span>
                </div>
              </div>
            ) : null}
            <div className="mt-3 flex gap-2">
              <Link
                href="/cart"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md border border-slate-300 py-1.5 text-center text-xs font-medium text-slate-800 hover:bg-slate-50"
              >
                {t("View cart")}
              </Link>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md bg-indigo-600 py-1.5 text-center text-xs font-semibold text-white hover:bg-indigo-700"
              >
                {t("Checkout")}
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
