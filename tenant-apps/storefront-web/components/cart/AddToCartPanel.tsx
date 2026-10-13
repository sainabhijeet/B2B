"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { emitStorefrontCartChanged } from "@/lib/cart-events";
import { formatCurrency } from "@/lib/language-consistency";
import {
  STOREFRONT_PRODUCT_READY_EVENT,
  type StorefrontProductReadyDetail,
} from "@/lib/storefront-loading-events";
import { translate } from "@/lib/translation-engine";

export type VariantOption = {
  id: string;
  sku: string;
  name?: string;
  price: string | null;
  moq: number;
  stockQuantity: number | null;
  priceSlabs?: { minQty: number; price: string; label?: string }[];
};

type Props = {
  productId: string;
  productName: string;
  productSlug: string;
  signedIn: boolean;
  languageCode?: string;
  variants: VariantOption[];
};

type AlertRow = { id: string; productId: string; variantId: string | null };

function apiMessage(body: { message?: string | string[] }, fallback: string): string {
  return typeof body.message === "string" ? body.message : Array.isArray(body.message) ? body.message.join(", ") : fallback;
}

export default function AddToCartPanel({ productId, productName, productSlug, signedIn, languageCode, variants }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const selected = variants.find((variant) => variant.id === variantId) ?? variants[0];
  const minimum = Math.max(1, selected?.moq ?? 1);
  const stock = selected?.stockQuantity == null ? null : Math.max(0, selected.stockQuantity);
  const unavailable = stock != null && stock < minimum;
  const [qty, setQty] = useState(minimum);
  const [livePrice, setLivePrice] = useState<string | null>(selected?.price ?? null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [alertBusy, setAlertBusy] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [initialCartReady, setInitialCartReady] = useState(!signedIn);
  const [initialAlertsReady, setInitialAlertsReady] = useState(!signedIn);
  const [priceRefreshVersion, setPriceRefreshVersion] = useState(0);
  const loginHref = `/login?next=${encodeURIComponent(`/product/${productSlug}`)}`;
  const activeAlert = alerts.find((alert) => alert.productId === productId && alert.variantId === selected?.id);
  const unitPrice = livePrice == null ? null : Number(livePrice);
  const validPrice = unitPrice != null && Number.isFinite(unitPrice) ? unitPrice : null;
  const slabs = [...(selected?.priceSlabs ?? [])].sort((a, b) => a.minQty - b.minQty);

  useEffect(() => {
    if (priceRefreshVersion === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPriceLoading(true);
      try {
        const response = await fetch(`/api/storefront/products/${encodeURIComponent(productSlug)}?qty=${qty}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { data?: { variants?: { id: string; price: string | null }[] } };
        const matching = body.data?.variants?.find((variant) => variant.id === variantId);
        if (!controller.signal.aborted && matching) setLivePrice(matching.price);
      } catch {
        // Keep the last API price if a live refresh is unavailable.
      } finally {
        if (!controller.signal.aborted) setPriceLoading(false);
      }
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [priceRefreshVersion, productSlug, qty, variantId]);

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    void fetch("/api/storefront/stock-alerts", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ data?: AlertRow[] }> : null)
      .then((body) => { if (!controller.signal.aborted && Array.isArray(body?.data)) setAlerts(body.data); })
      .catch(() => undefined)
      .finally(() => { if (!controller.signal.aborted) setInitialAlertsReady(true); });
    return () => controller.abort();
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    void fetch("/api/storefront/cart", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ data?: { items?: { productId: string }[] } }> : null)
      .then((body) => {
        if (!controller.signal.aborted && body?.data?.items?.some((item) => item.productId === productId)) setInCart(true);
      })
      .catch(() => undefined)
      .finally(() => { if (!controller.signal.aborted) setInitialCartReady(true); });
    return () => controller.abort();
  }, [productId, signedIn]);

  useEffect(() => {
    if (!initialCartReady || !initialAlertsReady) return;
    const detail: StorefrontProductReadyDetail = {
      path: `/product/${encodeURIComponent(productSlug)}`,
    };
    window.dispatchEvent(new CustomEvent(STOREFRONT_PRODUCT_READY_EVENT, { detail }));
  }, [initialAlertsReady, initialCartReady, productSlug]);

  function changeQuantity(value: number) {
    const next = Number.isFinite(value) ? Math.max(minimum, value) : minimum;
    const bounded = stock == null ? next : Math.min(next, Math.max(minimum, stock));
    if (bounded !== qty) {
      setQty(bounded);
      setPriceRefreshVersion((version) => version + 1);
    }
    setMsg(null);
  }

  async function add() {
    if (!selected || qty < minimum || (stock != null && qty > stock)) return;
    setBusy(true);
    setMsg(null);
    try {
      const response = await fetch("/api/storefront/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId: selected.id, quantity: qty }),
      });
      const body = await response.json().catch(() => ({})) as { message?: string | string[] };
      if (!response.ok) {
        setMsg(apiMessage(body, t("Could not add to cart.")));
        return;
      }
      setInCart(true);
      setMsg(t("Product added to cart successfully."));
      emitStorefrontCartChanged();
    } catch {
      setMsg(t("Network error. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function toggleStockAlert() {
    if (!selected) return;
    setAlertBusy(true);
    setMsg(null);
    try {
      const response = await fetch(activeAlert ? `/api/storefront/stock-alerts/${encodeURIComponent(activeAlert.id)}` : "/api/storefront/stock-alerts", {
        method: activeAlert ? "DELETE" : "POST",
        ...(activeAlert ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, variantId: selected.id }) }),
      });
      const body = await response.json().catch(() => ({})) as { data?: AlertRow; message?: string | string[] };
      if (!response.ok) {
        setMsg(apiMessage(body, t("Could not update stock notification.")));
        return;
      }
      setAlerts((previous) => activeAlert
        ? previous.filter((alert) => alert.id !== activeAlert.id)
        : body.data ? [body.data, ...previous] : previous);
      setMsg(t(activeAlert ? "Stock notification cancelled." : "We will notify you when this product is available."));
    } catch {
      setMsg(t("Network error. Please try again."));
    } finally {
      setAlertBusy(false);
    }
  }

  async function requestQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuoteBusy(true);
    setMsg(null);
    try {
      const response = await fetch("/api/storefront/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, productName, quantity: qty, ...(targetPrice ? { targetPrice: Number(targetPrice) } : {}), message: quoteMessage }),
      });
      const body = await response.json().catch(() => ({})) as { message?: string | string[] };
      if (!response.ok) {
        setMsg(apiMessage(body, t("Could not submit quote request.")));
        return;
      }
      setShowQuote(false);
      setTargetPrice("");
      setQuoteMessage("");
      setMsg(t("RFQ submitted successfully."));
    } catch {
      setMsg(t("Network error. Please try again."));
    } finally {
      setQuoteBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">{t("Order this product")}</h2>
      {variants.length > 1 ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700">{t("Choose pack / variant")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button key={variant.id} type="button" onClick={() => {
                setVariantId(variant.id);
                setQty(Math.max(1, variant.moq));
                setLivePrice(variant.price);
                setMsg(null);
              }} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${variant.id === selected?.id ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-white" : "border-slate-300 text-slate-700 hover:border-slate-500"}`}>
                {variant.name || variant.sku}
              </button>
            ))}
          </div>
        </div>
      ) : selected?.name ? <p className="mt-3 text-sm text-slate-600">{t("Pack")}: {selected.name}</p> : null}

      <div className="mt-4 border-y border-slate-100 py-3">
        <p className="text-2xl font-bold text-slate-950">{validPrice == null ? t("Price on request") : formatCurrency(validPrice, languageCode)}</p>
        {priceLoading ? <p className="mt-1 text-xs text-slate-500">{t("Updating price...")}</p> : null}
        {validPrice != null ? <p className="mt-1 text-xs text-slate-500">{t("Estimated total")}: {formatCurrency(validPrice * qty, languageCode)}</p> : null}
      </div>

      {selected ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span>{t("SKU")}: <span className="font-medium text-slate-800">{selected.sku}</span></span>
          <span>{t("MOQ")}: <span className="font-medium text-slate-800">{minimum}</span></span>
          <span className={unavailable ? "font-medium text-rose-700" : "font-medium text-emerald-700"}>
            {stock == null ? t("Stock checked when ordering") : unavailable ? t("Out of stock") : `${stock} ${t("available")}`}
          </span>
        </div>
      ) : null}

      {!unavailable && selected ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700">{t("Order quantity")}</p>
          <div className="mt-2 flex w-fit items-center overflow-hidden rounded-lg border border-slate-300">
            <button type="button" onClick={() => changeQuantity(qty - 1)} disabled={qty <= minimum} className="h-10 w-10 text-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40" aria-label={t("Decrease quantity")}>−</button>
            <input type="number" min={minimum} max={stock ?? undefined} value={qty} onChange={(event) => changeQuantity(Number.parseInt(event.target.value, 10))} className="w-16 border-x border-slate-300 py-2 text-center text-sm font-semibold outline-none" aria-label={t("Quantity")} />
            <button type="button" onClick={() => changeQuantity(qty + 1)} disabled={stock != null && qty >= stock} className="h-10 w-10 text-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40" aria-label={t("Increase quantity")}>+</button>
          </div>
        </div>
      ) : null}

      {slabs.length > 0 && validPrice != null ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-sm font-bold text-slate-800">{t("Tier pricing")}</h3>
          <div className="mt-2 space-y-1">
            {slabs.map((slab) => <div key={slab.minQty} className={`flex justify-between gap-2 text-xs ${qty >= slab.minQty ? "font-bold text-emerald-700" : "text-slate-600"}`}>
              <span>{qty >= slab.minQty ? "✓ " : ""}{slab.label || `${slab.minQty}+ ${t("units")}`}</span>
              <span>{formatCurrency(Number(slab.price), languageCode)}</span>
            </div>)}
          </div>
        </div>
      ) : null}

      {!signedIn ? (
        <>
          <Link href={loginHref} className="mt-5 flex w-full items-center justify-center rounded-lg bg-[var(--theme-primary)] px-4 py-3 text-sm font-bold text-white hover:opacity-90">{t(validPrice == null ? "Sign in to see price and order" : "Sign in to order")}</Link>
          {unavailable ? <Link href={loginHref} className="mt-3 block text-center text-xs font-semibold text-[var(--theme-primary)] hover:underline">{t("Sign in to request a stock notification")}</Link> : null}
        </>
      ) : unavailable ? (
        <button type="button" onClick={() => void toggleStockAlert()} disabled={alertBusy} className="mt-5 w-full rounded-lg border border-[var(--theme-primary)] px-4 py-3 text-sm font-bold text-[var(--theme-primary)] disabled:opacity-50">
          {alertBusy ? t("Updating...") : activeAlert ? t("Stock notification requested") : t("Notify me when available")}
        </button>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {inCart ? <Link href="/cart" className="rounded-lg border border-[var(--theme-primary)] px-2 py-3 text-center text-xs font-bold text-[var(--theme-primary)]">{t("Go to cart")}</Link> : (
            <button type="button" disabled={busy || !selected || qty < minimum || (stock != null && qty > stock)} onClick={() => void add()} className="rounded-lg bg-[var(--theme-primary)] px-2 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? t("Adding...") : t("Add to cart")}</button>
          )}
          <button type="button" disabled={busy || !selected || validPrice == null || priceLoading || qty < minimum || (stock != null && qty > stock)} onClick={() => router.push(`/checkout?buyNow=${encodeURIComponent(productSlug)}&variantId=${encodeURIComponent(selected.id)}&qty=${qty}`)} className="rounded-lg bg-slate-900 px-2 py-3 text-xs font-bold text-white disabled:opacity-50">{t("Buy Now")}</button>
        </div>
      )}

      {signedIn ? (
        <div className="mt-3">
          <button type="button" onClick={() => setShowQuote((value) => !value)} className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t("Request for quote")}</button>
          {showQuote ? <form onSubmit={(event) => void requestQuote(event)} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-600">{t(productName)} · {t("Qty")} {qty}</p>
            <label className="block text-xs font-medium text-slate-700">{t("Target unit price")}
              <input type="number" min="0.01" step="0.01" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-slate-700">{t("Message")}
              <textarea value={quoteMessage} maxLength={2000} onChange={(event) => setQuoteMessage(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <button type="submit" disabled={quoteBusy} className="w-full rounded-lg bg-[var(--theme-primary)] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{quoteBusy ? t("Submitting...") : t("Submit RFQ")}</button>
          </form> : null}
        </div>
      ) : null}
      {msg ? <p role="status" className="mt-3 text-sm text-slate-700">{t(msg)}</p> : null}
    </div>
  );
}
