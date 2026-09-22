"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CartLineItem } from "@/lib/cart-types";
import { backendOriginFromApiUrl } from "@/lib/api-origin";
import { emitStorefrontCartChanged } from "@/lib/cart-events";
import { lineSubtotal } from "@/components/cart/cart-client-api";
import { formatCurrency } from "@/lib/language-consistency";
import { translate } from "@/lib/translation-engine";

type Props = { item: CartLineItem; languageCode: string };

function imageUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  if (/^https?:\/\//iu.test(value) || value.startsWith("data:")) return value;
  return `${backendOriginFromApiUrl()}${value.startsWith("/") ? "" : "/"}${value}`;
}

function responseError(body: { message?: string | string[]; error?: string | string[] }, fallback: string): string {
  const detail = body.message ?? body.error;
  return typeof detail === "string" ? detail : Array.isArray(detail) ? detail.join(", ") : fallback;
}

export default function CartItemRow({ item, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const [qty, setQty] = useState(String(item.quantity));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = item.product?.name ?? t("Product");
  const sku = item.variant?.variantSku ?? "—";
  const href = item.product?.slug ? `/product/${encodeURIComponent(item.product.slug)}` : null;
  const image = imageUrl(item.product?.thumbnailUrl);
  const unitPrice = Number(item.priceSnapshot);
  const displayUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;
  const currentQty = Number.parseInt(qty, 10);
  const changed = qty !== String(item.quantity);

  useEffect(() => setQty(String(item.quantity)), [item.quantity]);

  async function saveQty() {
    if (!Number.isInteger(currentQty) || currentQty < 1) {
      setError(t("Quantity must be at least 1."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/storefront/cart/items/${encodeURIComponent(item.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: currentQty }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string | string[]; error?: string | string[] };
      if (!res.ok) {
        setError(responseError(body, `${t("Update failed")} (${res.status})`));
        return;
      }
      emitStorefrontCartChanged();
    } catch {
      setError(t("Network error. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/storefront/cart/items/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string | string[]; error?: string | string[] };
        setError(responseError(body, `${t("Remove failed")} (${res.status})`));
        return;
      }
      emitStorefrontCartChanged();
    } catch {
      setError(t("Network error. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-2 sm:h-36 sm:w-36">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={title} className="h-full w-full object-contain" />
          ) : (
            <span className="text-center text-xs text-slate-400">{t("No image available")}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {href ? (
                <Link href={href} className="text-base font-bold text-slate-900 hover:text-[var(--theme-primary)] sm:text-lg">{title}</Link>
              ) : (
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
              )}
              <p className="mt-1 text-xs text-slate-500">{t("SKU")}: {sku}</p>
            </div>
            <button type="button" onClick={() => void remove()} disabled={busy} className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
              {t("Remove")}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs text-slate-500">{t("Unit price")}</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{formatCurrency(displayUnitPrice, languageCode)}</p>
            </div>
            <div className="flex items-end gap-2">
              <label className="block text-xs font-medium text-slate-600">
                {t("Quantity")}
                <span className="mt-1 flex h-10 overflow-hidden rounded-lg border border-slate-300 bg-white">
                  <button type="button" aria-label={t("Decrease quantity")} disabled={busy || currentQty <= 1} onClick={() => setQty(String(Math.max(1, (currentQty || 1) - 1)))} className="w-9 border-r border-slate-200 text-base text-slate-700 hover:bg-slate-50 disabled:opacity-40">−</button>
                  <input aria-label={t("Quantity")} value={qty} onChange={(event) => setQty(event.target.value.replace(/\D/gu, ""))} inputMode="numeric" disabled={busy} className="w-12 text-center text-sm font-semibold text-slate-900 outline-none" />
                  <button type="button" aria-label={t("Increase quantity")} disabled={busy} onClick={() => setQty(String((currentQty || 0) + 1))} className="w-9 border-l border-slate-200 text-base text-slate-700 hover:bg-slate-50 disabled:opacity-40">+</button>
                </span>
              </label>
              {changed ? <button type="button" disabled={busy} onClick={() => void saveQty()} className="h-10 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50">{busy ? t("Updating…") : t("Update")}</button> : null}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">{t("Line total")}</p>
              <p className="mt-1 text-lg font-bold text-slate-950">{formatCurrency(lineSubtotal(item), languageCode)}</p>
            </div>
          </div>
          {error ? <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
        </div>
      </div>
    </article>
  );
}
