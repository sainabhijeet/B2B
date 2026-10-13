"use client";

import Link from "next/link";
import type { CartLineItem } from "@/lib/cart-types";
import { lineSubtotal } from "@/components/cart/cart-client-api";
import { formatCurrency } from "@/lib/language-consistency";
import { translate } from "@/lib/translation-engine";

type Props = { items: CartLineItem[]; languageCode: string };

export default function CartSummary({ items, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const subtotal = items.reduce((sum, item) => sum + lineSubtotal(item), 0);
  const units = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section aria-label={t("Order summary")} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-slate-950">{t("Order summary")}</h2>
      <div className="mt-5 space-y-3 border-b border-slate-200 pb-5 text-sm">
        <div className="flex items-center justify-between text-slate-600">
          <span>{t("Products")} ({units})</span>
          <span className="font-medium text-slate-900">{formatCurrency(subtotal, languageCode)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>{t("Shipping and taxes")}</span>
          <span className="text-xs">{t("Calculated at checkout")}</span>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="font-semibold text-slate-900">{t("Subtotal")}</span>
        <span className="text-2xl font-bold text-slate-950">{formatCurrency(subtotal, languageCode)}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{t("GST / invoice lines follow at checkout when enabled.")}</p>
      <p className="mt-4 text-sm text-slate-600">
        {t("Delivery address")}: <Link href="/checkout#delivery-address" className="font-semibold text-[var(--theme-primary)] hover:underline">{t("Select or add at checkout")}</Link>
      </p>
      <Link href="/checkout" className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--theme-primary)] px-4 text-sm font-bold text-white transition hover:brightness-95">
        {t("Proceed to checkout")} <span aria-hidden="true" className="ml-2">→</span>
      </Link>
      <Link href="/category" className="mt-4 block text-center text-sm font-semibold text-slate-600 hover:text-slate-900">
        {t("Continue shopping")}
      </Link>
    </section>
  );
}
