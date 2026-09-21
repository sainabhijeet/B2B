"use client";

import type { StorefrontAddress } from "@/lib/checkout-types";
import { translate } from "@/lib/translation-engine";

type Props = {
  addresses: StorefrontAddress[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  languageCode: string;
};

export default function CheckoutAddress({ addresses, value, onChange, disabled, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  if (addresses.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">{t("Shipping address")}</h2>
      <p className="mt-1 text-xs text-slate-500">{t("Used for delivery and tax records. Managed by your distributor.")}</p>
      <ul className="mt-3 space-y-2">
        {addresses.map((a) => {
          const id = a.id;
          const checked = value === id;
          const line2 = a.line2 ? `, ${a.line2}` : "";
          return (
            <li key={id}>
              <label
                className={`flex cursor-pointer gap-3 rounded-md border p-3 text-sm ${
                  checked ? "border-indigo-500 bg-indigo-50/40" : "border-slate-200 hover:border-slate-300"
                } ${disabled ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="ship-addr"
                  className="mt-1"
                  checked={checked}
                  onChange={() => onChange(id)}
                  disabled={disabled}
                />
                <span className="min-w-0 text-slate-700">
                  <span className="font-medium text-slate-900">{a.label ?? t("Address")}</span>
                  {a.isDefault ? (
                    <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                      {t("Default")}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-slate-600">
                    {a.line1}
                    {line2}, {a.city}, {a.state} {a.pincode}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
