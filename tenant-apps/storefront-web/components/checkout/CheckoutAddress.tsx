"use client";

import { useState, type FormEvent } from "react";
import type { StorefrontAddress } from "@/lib/checkout-types";
import { translate } from "@/lib/translation-engine";

type Props = {
  addresses: StorefrontAddress[];
  value: string | null;
  onChange: (id: string) => void;
  onAdded: (address: StorefrontAddress) => void;
  disabled?: boolean;
  languageCode: string;
};

type AddressForm = {
  label: string;
  customLabel: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

const EMPTY_FORM: AddressForm = {
  label: "Home",
  customLabel: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};

function apiMessage(body: { message?: string | string[]; error?: string | string[] }): string {
  const detail = body.message ?? body.error;
  return typeof detail === "string" ? detail : Array.isArray(detail) ? detail.join(", ") : "";
}

export default function CheckoutAddress({ addresses, value, onChange, onAdded, disabled, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const [formOpen, setFormOpen] = useState(addresses.length === 0);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof AddressForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || disabled) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/storefront/customer/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label === "Other" ? form.customLabel.trim() || "Other" : form.label,
          line1: form.line1.trim(),
          line2: form.line2.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          countryCode: "IN",
          isDefault: addresses.length === 0,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: StorefrontAddress;
        message?: string | string[];
        error?: string | string[];
      };
      if (!response.ok || !body.data?.id) {
        setError(t(apiMessage(body) || `Could not save address (${response.status}).`));
        return;
      }
      onAdded(body.data);
      setForm(EMPTY_FORM);
      setFormOpen(false);
    } catch {
      setError(t("Network error. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/15";

  return (
    <section id="delivery-address" className="scroll-mt-28 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-950">{t("Delivery address")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("Choose where this order should be delivered.")}</p>
        </div>
        {!formOpen ? (
          <button type="button" onClick={() => setFormOpen(true)} disabled={disabled} className="text-sm font-semibold text-[var(--theme-primary)] hover:underline disabled:opacity-50">
            + {t("Add new address")}
          </button>
        ) : null}
      </div>

      {addresses.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {addresses.map((address) => {
            const checked = value === address.id;
            return (
              <label key={address.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-sm transition ${checked ? "border-[var(--theme-primary)] bg-slate-50 ring-1 ring-[var(--theme-primary)]" : "border-slate-200 hover:border-slate-300"} ${disabled ? "pointer-events-none opacity-60" : ""}`}>
                <input type="radio" name="shipping-address" checked={checked} onChange={() => onChange(address.id)} disabled={disabled} className="mt-1 accent-[var(--theme-primary)]" />
                <span className="min-w-0">
                  <span className="font-semibold text-slate-900">{address.label || t("Address")}</span>
                  {address.isDefault ? <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{t("Default")}</span> : null}
                  <span className="mt-1 block leading-5 text-slate-600">{[address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", ")}</span>
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{t("Add a delivery address to continue checkout.")}</p>
      )}

      {formOpen ? (
        <form onSubmit={(event) => void saveAddress(event)} className="mt-5 space-y-4 border-t border-slate-200 pt-5">
          <h3 className="text-sm font-bold text-slate-900">{t("Add new address")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-700">{t("Save as")}
              <select value={form.label} onChange={(event) => update("label", event.target.value)} disabled={busy || disabled} className={inputClass}>
                <option value="Home">{t("Home")}</option>
                <option value="Office">{t("Office")}</option>
                <option value="Other">{t("Other")}</option>
              </select>
              {form.label === "Other" ? (
                <input value={form.customLabel} onChange={(event) => update("customLabel", event.target.value)} maxLength={64} disabled={busy || disabled} className={inputClass} placeholder={t("Custom label (optional)")} />
              ) : null}
            </label>
            <label className="text-xs font-medium text-slate-700">{t("Pincode")}
              <input value={form.pincode} onChange={(event) => update("pincode", event.target.value.replace(/\D/gu, "").slice(0, 6))} inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" required disabled={busy || disabled} className={inputClass} />
            </label>
            <label className="text-xs font-medium text-slate-700 sm:col-span-2">{t("Address line 1")}
              <input value={form.line1} onChange={(event) => update("line1", event.target.value)} autoComplete="address-line1" maxLength={255} required disabled={busy || disabled} className={inputClass} placeholder={t("House number and street")} />
            </label>
            <label className="text-xs font-medium text-slate-700 sm:col-span-2">{t("Address line 2 (optional)")}
              <input value={form.line2} onChange={(event) => update("line2", event.target.value)} autoComplete="address-line2" maxLength={255} disabled={busy || disabled} className={inputClass} placeholder={t("Area or landmark")} />
            </label>
            <label className="text-xs font-medium text-slate-700">{t("City")}
              <input value={form.city} onChange={(event) => update("city", event.target.value)} autoComplete="address-level2" maxLength={128} required disabled={busy || disabled} className={inputClass} />
            </label>
            <label className="text-xs font-medium text-slate-700">{t("State")}
              <input value={form.state} onChange={(event) => update("state", event.target.value)} autoComplete="address-level1" maxLength={128} required disabled={busy || disabled} className={inputClass} />
            </label>
          </div>
          {error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy || disabled} className="rounded-lg bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-bold text-white hover:brightness-95 disabled:opacity-50">{busy ? t("Saving…") : t("Save address")}</button>
            {addresses.length > 0 ? <button type="button" onClick={() => { setFormOpen(false); setError(""); }} disabled={busy} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t("Cancel")}</button> : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
