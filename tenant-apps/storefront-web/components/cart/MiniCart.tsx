"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { STOREFRONT_CART_CHANGED } from "@/lib/cart-events";
import type { CartLineItem } from "@/lib/cart-types";
import { getCartEnvelope, lineSubtotal } from "@/components/cart/cart-client-api";
import { translate } from "@/lib/translation-engine";
import { isPreviewCommerceLocation, PREVIEW_COMMERCE_CHANGED, readPreviewCart } from "@/lib/preview-commerce";
import { useCustomerSignedIn } from "@/components/auth/CustomerAuthContext";
import { customerLoginHref, customerLoginHrefWithCurrentContext, storefrontHrefWithCurrentContext } from "@/lib/customer-login-redirect";

export default function MiniCart({ languageCode, displayMode = "default", directNavigation = false, iconOnly = false, active = false }: { languageCode?: string; displayMode?: "default" | "atelier" | "nav" | "mobile-nav" | "textile-utility"; directNavigation?: boolean; iconOnly?: boolean; active?: boolean }) {
  const t = (text: string) => translate(text, languageCode);
  const pathname = usePathname();
  const signedIn = useCustomerSignedIn();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (isPreviewCommerceLocation()) {
      setAuthed(true);
      setItems(readPreviewCart().map((item) => ({
        id: `${item.productId}:${item.variantId}`,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        priceSnapshot: String(item.price ?? 0),
        product: { id: item.productId, name: item.productName, slug: item.productSlug, thumbnailUrl: item.image ?? null },
        variant: item.variantId ? { id: item.variantId, variantSku: item.sku } : null,
      })));
      setLoading(false);
      return;
    }
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
    window.addEventListener(PREVIEW_COMMERCE_CHANGED, onChange);
    return () => {
      window.removeEventListener(STOREFRONT_CART_CHANGED, onChange);
      window.removeEventListener(PREVIEW_COMMERCE_CHANGED, onChange);
    };
  }, [load]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePress, true);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePress, true);
    };
  }, [open]);

  const count = new Set(items.map((item) => item.productId)).size;
  const countLabel = t(count === 1 ? "Product" : "Products");
  const subtotal = items.reduce((s, it) => s + lineSubtotal(it), 0);
  const cartIsAvailable = signedIn && authed !== false;
  const cartHref = cartIsAvailable ? "/cart" : customerLoginHref("/cart");
  const handleDirectNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign(cartIsAvailable
      ? storefrontHrefWithCurrentContext("/cart")
      : customerLoginHrefWithCurrentContext("/cart"));
  };

  if (displayMode === "nav") {
    return (
      <Link
        href={cartHref}
        onClick={directNavigation ? handleDirectNavigation : undefined}
        className={`group relative flex shrink-0 items-center gap-2 px-1 text-xs font-bold transition ${active ? "text-[var(--header-primary)]" : "text-slate-800 hover:text-[var(--header-primary)]"}`}
        aria-label={`${t("Cart")}${count > 0 ? ` (${count})` : ""}`}
      >
        <span>{t("Cart")}</span>
        {count > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2a1930] px-1.5 text-[10px] font-black leading-none text-[#f3c96f] shadow-[0_2px_8px_rgba(42,25,48,0.24)] ring-1 ring-[#f3c96f]/70">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
        <span className={`absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-[var(--header-primary)] transition-transform ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} aria-hidden="true" />
      </Link>
    );
  }

  if (displayMode === "mobile-nav") {
    return (
      <Link
        href={cartHref}
        onClick={directNavigation ? handleDirectNavigation : undefined}
        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-[var(--header-soft)] text-[var(--header-primary)]" : "text-slate-700 hover:bg-slate-50 hover:text-[var(--header-primary)]"}`}
        aria-label={`${t("Cart")}${count > 0 ? ` (${count})` : ""}`}
      >
        <span>{t("Cart")}</span>
        {count > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--header-primary)] px-1.5 text-[10px] font-extrabold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    );
  }

  if (directNavigation) {
    return (
      <Link
        href={cartHref}
        onClick={handleDirectNavigation}
        className={iconOnly
          ? "group relative flex h-full w-full items-center justify-center text-slate-950 transition hover:text-[var(--header-primary)]"
          : "group relative flex min-h-11 items-center gap-2.5 px-1 text-slate-950 transition hover:text-[var(--header-primary)]"}
        aria-label={`${t("Cart")}${count > 0 ? ` (${count})` : ""}`}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-7 w-7" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2.1 10.15a2 2 0 0 0 1.96 1.6h7.88a2 2 0 0 0 1.96-1.6L20.25 7H6M9.5 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM18 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
          {count > 0 ? (
            <span className="absolute -right-1 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--header-primary)] px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
        {!iconOnly ? (
          <span className="flex flex-col items-start leading-tight">
            <span className="text-xs font-extrabold">{t("Cart")}</span>
            <span className="mt-0.5 text-[10px] font-medium text-slate-500">
              {t("INR")} {subtotal.toLocaleString(languageCode, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div className={displayMode === "textile-utility" ? "relative lg:hidden" : "relative"}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={displayMode === "atelier"
          ? "aurelia-bag-button group relative flex h-11 items-center gap-2.5 text-slate-950 transition"
          : "group relative flex h-11 items-center gap-2.5 px-1 text-slate-950 transition hover:text-[var(--header-primary)]"}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${t(displayMode === "atelier" ? "The bag" : "Cart")}${count > 0 ? ` (${count})` : ""}`}
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
        {displayMode === "atelier" ? (
          <span className="aurelia-utility-label hidden flex-col items-start xl:flex">
            <span>{t("The bag")}</span>
            <small>{count} {countLabel} · {t("INR")} {subtotal.toLocaleString(languageCode, { maximumFractionDigits: 0 })}</small>
          </span>
        ) : (
          <span className="hidden flex-col items-start leading-tight xl:flex">
            <span className="text-xs font-extrabold">{t("Cart")}</span>
            <span className="mt-0.5 text-[10px] font-medium text-slate-500">
              {t("INR")} {subtotal.toLocaleString(languageCode, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </span>
        )}
      </button>

      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default bg-black/20" aria-label={t("Close cart")} onClick={() => setOpen(false)} />
          <div ref={panelRef} role="dialog" aria-modal="true" aria-label={t("Your cart")} className={`absolute right-0 top-full z-50 mt-3 w-[min(100vw-2rem,22rem)] border bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.2)] ${displayMode === "atelier" ? "rounded-none border-[#bd9048]/40" : "rounded-3xl border-slate-200"}`}>
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-[var(--header-soft)] px-3 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--header-primary)] shadow-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l2.1 10.15a2 2 0 0 0 1.96 1.6h7.88a2 2 0 0 0 1.96-1.6L20.25 7H6" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-900">{t(displayMode === "atelier" ? "The bag" : "Your cart")}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{count} {countLabel}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium text-slate-600 transition hover:border-[var(--header-primary)] hover:text-[var(--header-primary)]" aria-label={t("Close cart")}>
                <span aria-hidden="true">×</span>
              </button>
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
                {t(displayMode === "atelier" ? "View the bag" : "View cart")}
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
