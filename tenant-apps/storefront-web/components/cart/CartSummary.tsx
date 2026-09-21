"use client";

import type { CartLineItem } from "@/lib/cart-types";
import { lineSubtotal } from "@/components/cart/cart-client-api";
import { translate } from "@/lib/translation-engine";

type Props = {
  items: CartLineItem[];
  languageCode: string;
};

export default function CartSummary({ items, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const subtotal = items.reduce((s, it) => s + lineSubtotal(it), 0);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="flex justify-between font-medium text-slate-900">
        <span>{t("Subtotal")}</span>
        <span>₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{t("GST / invoice lines follow at checkout when enabled.")}</p>
    </div>
  );
}
