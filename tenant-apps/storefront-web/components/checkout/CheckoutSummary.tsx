"use client";

import type { CartLineItem } from "@/lib/cart-types";
import { translate } from "@/lib/translation-engine";

function lineSubtotalExTax(unit: string, qty: number): number {
  const u = Number.parseFloat(unit);
  return (Number.isFinite(u) ? u : 0) * qty;
}

function lineTax(unit: string, qty: number, taxRatePct: string | undefined): number {
  const line = lineSubtotalExTax(unit, qty);
  const r = Number.parseFloat(taxRatePct ?? "0");
  const rate = Number.isFinite(r) ? r : 0;
  return (line * rate) / 100;
}

export function cartTotalsForCheckout(items: CartLineItem[]) {
  let subtotal = 0;
  let tax = 0;
  for (const it of items) {
    subtotal += lineSubtotalExTax(it.priceSnapshot, it.quantity);
    tax += lineTax(it.priceSnapshot, it.quantity, it.taxRate ?? it.product?.taxRate);
  }
  return { subtotal, tax, total: subtotal + tax };
}

type Props = { items: CartLineItem[]; languageCode: string };

export default function CheckoutSummary({ items, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const { subtotal, tax, total } = cartTotalsForCheckout(items);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">{t("Order summary")}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((it) => (
          <li key={it.id} className="flex justify-between gap-2 text-slate-700">
            <span className="min-w-0 truncate">
              {it.product?.name ?? t("Product")}
              <span className="text-slate-500"> × {it.quantity}</span>
            </span>
            <span className="shrink-0 font-medium text-slate-800">
              ₹{lineSubtotalExTax(it.priceSnapshot, it.quantity).toLocaleString("en-IN")}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
        <div className="flex justify-between text-slate-600">
          <dt>{t("Subtotal")}</dt>
          <dd className="font-medium text-slate-800">₹{subtotal.toLocaleString("en-IN")}</dd>
        </div>
        <div className="flex justify-between text-slate-600">
          <dt>{t("GST (from catalog)")}</dt>
          <dd className="font-medium text-slate-800">₹{tax.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold text-slate-900">
          <dt>{t("Total")}</dt>
          <dd>₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</dd>
        </div>
      </dl>
    </section>
  );
}
