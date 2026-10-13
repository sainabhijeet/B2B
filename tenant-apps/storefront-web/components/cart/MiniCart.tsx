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
        className="group relative flex h-11 items-center gap-2.5 px-1 text-slate-950 transition hover:text-[var(--header-primary)]"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${t("Cart")}${count > 0 ? ` (${count})` : ""}`}
      >
        <span className="relative flex h-8 w-8 items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-7 w-7" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2.1 10.15a2 2 0 0 0 1.96 1.6h7.88a2 2 0 0 0 1.96-1.6L20.25 7H6M9.5 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM18 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
          {count > 0 ? (
            <span className="absolute -right-1 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--header-primary)] px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
        <span className="hidden flex-col items-start leading-tight xl:flex">
          <span className="text-xs font-extrabold">{t("Cart")}</span>
          <span className="mt-0.5 text-[10px] font-medium text-slate-500">
            {t("INR")} {subtotal.toLocaleString(languageCode, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </span>
      </button>

      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-black/20" aria-label={t("Close cart")} onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-3 w-[min(100vw-2rem,22rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.2)]">
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-[var(--header-soft)] px-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--header-primary)] shadow-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2.1 10.15a2 2 0 0 0 1.96 1.6h7.88a2 2 0 0 0 1.96-1.6L20.25 7H6" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-extrabold text-slate-900">{t("Your cart")}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{count} {t("items")}</p>
              </div>
            </div>
            {loading ? <p className="mt-2 text-xs text-slate-500">{t("Loading")}...</p> : null}
            {!loading && authed === false ? (
              <p className="mt-2 text-xs text-slate-600">
                <Link href="/login?next=%2Fcart" className="font-bold text-[var(--header-primary)] hover:underline" onClick={() => setOpen(false)}>
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
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-center text-xs font-bold text-slate-800 transition hover:bg-slate-50"
              >
                {t("View cart")}
              </Link>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl bg-[var(--header-primary)] py-2.5 text-center text-xs font-bold text-white shadow-sm transition hover:brightness-95"
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
