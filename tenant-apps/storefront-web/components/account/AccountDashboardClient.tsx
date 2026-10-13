"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  CreditCard,
  Heart,
  LogOut,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { ApiEnvelope, CustomerAddress, CustomerProfile } from "@/lib/account-types";
import { formatCurrency } from "@/lib/language-consistency";
import { translate } from "@/lib/translation-engine";

type AddressDraft = {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  countryCode: string;
  isDefault: boolean;
};

type AddressLabelOption = "Home" | "Office" | "Other";

const ADDRESS_LABEL_OPTIONS: AddressLabelOption[] = ["Home", "Office", "Other"];

const EMPTY_ADDRESS: AddressDraft = {
  label: "Home",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  countryCode: "IN",
  isDefault: false,
};

function savedAddressLabel(value: string | null | undefined): {
  option: AddressLabelOption;
  custom: string;
} {
  const label = value?.trim() ?? "";
  if (/^home$/iu.test(label)) return { option: "Home", custom: "" };
  if (/^(office|work)$/iu.test(label)) return { option: "Office", custom: "" };
  if (!label || /^other$/iu.test(label)) return { option: "Other", custom: "" };
  return { option: "Other", custom: label };
}

function numberValue(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function responseMessage(body: ApiEnvelope<unknown> | null, fallback: string): string {
  const message = body?.message;
  if (Array.isArray(message)) return message.join(" ");
  return typeof message === "string" && message.trim() ? message : fallback;
}

function addressDraft(address: CustomerAddress): AddressDraft {
  return {
    label: address.label ?? "",
    line1: address.line1 ?? "",
    line2: address.line2 ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    pincode: address.pincode ?? "",
    countryCode: address.countryCode || "IN",
    isDefault: address.isDefault === true,
  };
}

function addressText(address: CustomerAddress): string {
  return [address.line1, address.line2, address.city, address.state, address.pincode, address.countryCode]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/15";

export default function AccountDashboardClient({
  initialProfile,
  languageCode,
  creditViewEnabled,
}: {
  initialProfile: CustomerProfile;
  languageCode: string;
  creditViewEnabled: boolean;
}) {
  const router = useRouter();
  const t = (text: string) => translate(text, languageCode);
  const [profile, setProfile] = useState(initialProfile);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email ?? "");
  const [addressEditorOpen, setAddressEditorOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [addressLabelOption, setAddressLabelOption] = useState<AddressLabelOption>("Home");
  const [customAddressLabel, setCustomAddressLabel] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(initialProfile);
    setName(initialProfile.name);
    setEmail(initialProfile.email ?? "");
  }, [initialProfile]);

  const limit = numberValue(profile.creditLimit);
  const outstanding = numberValue(profile.creditBalance);
  const available = Math.max(limit - outstanding, 0);
  const usedPercent = limit > 0 ? Math.min((outstanding / limit) * 100, 100) : 0;
  const initials = profile.name.trim().slice(0, 1).toUpperCase() || "U";

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("profile");
    setNotice(null);
    try {
      const response = await fetch("/api/storefront/customer/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || null }),
      });
      const body = await response.json().catch(() => null) as ApiEnvelope<CustomerProfile> | null;
      if (!response.ok) throw new Error(responseMessage(body, t("Could not update profile.")));
      setProfile((current) => ({ ...current, ...(body?.data ?? {}), name: name.trim(), email: email.trim() || null }));
      setProfileEditorOpen(false);
      setNotice({ type: "success", text: t("Profile updated successfully.") });
      router.refresh();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : t("Could not update profile.") });
    } finally {
      setBusyAction(null);
    }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice({ type: "error", text: t("Choose an image file.") });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ type: "error", text: t("Profile image must be 5 MB or smaller.") });
      return;
    }
    setBusyAction("avatar");
    setNotice(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/storefront/customer/me/avatar", { method: "POST", body: formData });
      const body = await response.json().catch(() => null) as ApiEnvelope<CustomerProfile> | null;
      if (!response.ok) throw new Error(responseMessage(body, t("Could not upload profile photo.")));
      setProfile((current) => ({ ...current, profileImageUrl: URL.createObjectURL(file) }));
      setNotice({ type: "success", text: t("Profile photo updated successfully.") });
      router.refresh();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : t("Could not upload profile photo.") });
    } finally {
      setBusyAction(null);
      event.target.value = "";
    }
  }

  function openNewAddress() {
    setEditingAddressId(null);
    setDraft({ ...EMPTY_ADDRESS, isDefault: profile.addresses.length === 0 });
    setAddressLabelOption("Home");
    setCustomAddressLabel("");
    setAddressEditorOpen(true);
    setNotice(null);
  }

  function openAddressEditor(address: CustomerAddress) {
    const savedLabel = savedAddressLabel(address.label);
    setEditingAddressId(address.id);
    setDraft(addressDraft(address));
    setAddressLabelOption(savedLabel.option);
    setCustomAddressLabel(savedLabel.custom);
    setAddressEditorOpen(true);
    setNotice(null);
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = editingAddressId ? `address-${editingAddressId}` : "new-address";
    setBusyAction(action);
    setNotice(null);
    try {
      const url = editingAddressId
        ? `/api/storefront/customer/addresses/${encodeURIComponent(editingAddressId)}`
        : "/api/storefront/customer/addresses";
      const response = await fetch(url, {
        method: editingAddressId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          label: addressLabelOption === "Other" ? customAddressLabel.trim() || "Other" : addressLabelOption,
          countryCode: draft.countryCode.trim().toUpperCase() || "IN",
        }),
      });
      const body = await response.json().catch(() => null) as ApiEnvelope<CustomerAddress> | null;
      if (!response.ok || !body?.data) throw new Error(responseMessage(body, t("Could not save address.")));
      const saved = body.data;
      setProfile((current) => {
        let addresses = editingAddressId
          ? current.addresses.map((item) => item.id === editingAddressId ? saved : item)
          : [...current.addresses, saved];
        if (saved.isDefault) addresses = addresses.map((item) => ({ ...item, isDefault: item.id === saved.id }));
        return { ...current, addresses };
      });
      setAddressEditorOpen(false);
      setEditingAddressId(null);
      setNotice({ type: "success", text: t(editingAddressId ? "Address updated." : "Address saved.") });
      router.refresh();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : t("Could not save address.") });
    } finally {
      setBusyAction(null);
    }
  }

  async function setDefaultAddress(addressId: string) {
    setBusyAction(`default-${addressId}`);
    setNotice(null);
    try {
      const response = await fetch(`/api/storefront/customer/addresses/${encodeURIComponent(addressId)}/default`, { method: "POST" });
      const body = await response.json().catch(() => null) as ApiEnvelope<CustomerAddress> | null;
      if (!response.ok) throw new Error(responseMessage(body, t("Could not update default address.")));
      setProfile((current) => ({ ...current, addresses: current.addresses.map((item) => ({ ...item, isDefault: item.id === addressId })) }));
      setNotice({ type: "success", text: t("Default address updated.") });
      router.refresh();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : t("Could not update default address.") });
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteAddress(address: CustomerAddress) {
    if (!window.confirm(t("Delete this saved address?"))) return;
    setBusyAction(`delete-${address.id}`);
    setNotice(null);
    try {
      const response = await fetch(`/api/storefront/customer/addresses/${encodeURIComponent(address.id)}`, { method: "DELETE" });
      const body = await response.json().catch(() => null) as ApiEnvelope<unknown> | null;
      if (!response.ok) throw new Error(responseMessage(body, t("Could not delete address.")));
      setProfile((current) => ({ ...current, addresses: current.addresses.filter((item) => item.id !== address.id) }));
      setNotice({ type: "success", text: t("Address deleted.") });
      router.refresh();
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : t("Could not delete address.") });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-[65vh] bg-slate-50/80 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label={t("Breadcrumb")} className="mb-6 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-[var(--theme-primary)]">{t("Home")}</Link><span>/</span><span className="font-semibold text-slate-800">{t("My account")}</span>
        </nav>

        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--theme-primary)]">{t("Account dashboard")}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{t("Your account")}</h1><p className="mt-2 text-sm text-slate-600">{t("Manage your profile, credit and delivery addresses.")}</p></div>
          <div className="flex flex-wrap gap-2">
            <Link href="/orders" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"><Package className="h-4 w-4" />{t("Orders")}</Link>
            <Link href="/wishlist" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"><Heart className="h-4 w-4" />{t("Wishlist")}</Link>
          </div>
        </div>

        {notice ? <div role={notice.type === "error" ? "alert" : "status"} className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.text}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-24 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]" />
              <div className="px-5 pb-6 text-center">
                <div className="relative mx-auto -mt-12 h-24 w-24">
                  {profile.profileImageUrl ? (
                    // Signed private customer images are intentionally loaded directly.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.profileImageUrl} alt={profile.name || t("Customer")} className="h-24 w-24 rounded-full border-4 border-white bg-white object-cover shadow-md" />
                  ) : <span className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-3xl font-black text-[var(--theme-primary)] shadow-md">{initials}</span>}
                  <button type="button" onClick={() => avatarInput.current?.click()} disabled={busyAction === "avatar"} aria-label={t("Update profile photo")} className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--theme-primary)] text-white shadow transition hover:brightness-95 disabled:opacity-60"><Camera className="h-4 w-4" /></button>
                  <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={uploadAvatar} />
                </div>
                <h2 className="mt-3 truncate text-xl font-bold text-slate-950">{profile.name || t("Customer")}</h2>
                <p className="mt-1 truncate text-sm text-slate-500">{profile.mobile || t("Mobile not available")}</p>
                <button type="button" onClick={() => setProfileEditorOpen((value) => !value)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-bold text-white hover:brightness-95"><Pencil className="h-4 w-4" />{t("Edit profile")}</button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-950">{t("Account actions")}</h2>
              <form action="/api/storefront/auth/logout" method="post"><button type="submit" className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" />{t("Log out")}</button></form>
              <Link href="/account/delete" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" />{t("Delete account")}</Link>
            </section>
          </aside>

          <div className="space-y-6">
            {profileEditorOpen ? (
              <section className="rounded-2xl border border-[var(--theme-primary)]/30 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-950">{t("Edit profile")}</h2><button type="button" onClick={() => setProfileEditorOpen(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">{t("Cancel")}</button></div>
                <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label={t("Name")}><input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} required className={inputClass} /></Field>
                  <Field label={t("Email")}><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" maxLength={255} className={inputClass} placeholder={t("Email not added")} /></Field>
                  <div className="sm:col-span-2"><button disabled={busyAction === "profile"} className="rounded-xl bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyAction === "profile" ? t("Saving…") : t("Save profile")}</button></div>
                </form>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2"><UserRound className="h-5 w-5 text-[var(--theme-primary)]" /><h2 className="text-lg font-bold text-slate-950">{t("Contact details")}</h2></div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4"><dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Phone className="h-4 w-4" />{t("Mobile")}</dt><dd className="mt-2 font-semibold text-slate-900">{profile.mobile || t("Not available")}</dd></div>
                <div className="rounded-xl bg-slate-50 p-4"><dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Mail className="h-4 w-4" />{t("Email")}</dt><dd className="mt-2 break-all font-semibold text-slate-900">{profile.email || t("Not added")}</dd></div>
              </dl>
            </section>

            {creditViewEnabled ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-[var(--theme-primary)]" /><h2 className="text-lg font-bold text-slate-950">{t("Credit summary")}</h2></div>
                  <Link href="/account/credit" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"><ReceiptText className="h-4 w-4" />{t("View ledger and statement")}</Link>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{t("Credit limit")}</p><p className="mt-2 text-xl font-bold text-slate-950">{formatCurrency(limit, languageCode, "INR")}</p></div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{t("Outstanding")}</p><p className="mt-2 text-xl font-bold text-amber-700">{formatCurrency(outstanding, languageCode, "INR")}</p></div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">{t("Available credit")}</p><p className="mt-2 text-xl font-bold text-emerald-700">{formatCurrency(available, languageCode, "INR")}</p></div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--theme-primary)] transition-all" style={{ width: `${usedPercent}%` }} /></div>
                <p className="mt-2 text-right text-xs text-slate-500">{Math.round(usedPercent)}% {t("of credit limit used")}</p>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[var(--theme-primary)]" /><div><h2 className="text-lg font-bold text-slate-950">{t("Saved addresses")}</h2><p className="text-xs text-slate-500">{profile.addresses.length} {t(profile.addresses.length === 1 ? "address" : "addresses")}</p></div></div><button type="button" onClick={openNewAddress} className="inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-bold text-white hover:brightness-95"><Plus className="h-4 w-4" />{t("Add address")}</button></div>

              {addressEditorOpen ? (
                <form onSubmit={saveAddress} className="mt-5 grid gap-4 rounded-2xl border border-[var(--theme-primary)]/20 bg-slate-50 p-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between sm:col-span-2"><h3 className="font-bold text-slate-900">{t(editingAddressId ? "Edit address" : "New address")}</h3><button type="button" onClick={() => setAddressEditorOpen(false)} className="text-sm font-semibold text-slate-500">{t("Cancel")}</button></div>
                  <div className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                    <span>{t("Save as")}</span>
                    <div role="radiogroup" aria-label={t("Save address as")} className="flex flex-wrap gap-2">
                      {ADDRESS_LABEL_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={addressLabelOption === option}
                          onClick={() => setAddressLabelOption(option)}
                          className={`min-w-24 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${addressLabelOption === option ? "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"}`}
                        >
                          {t(option)}
                        </button>
                      ))}
                    </div>
                    {addressLabelOption === "Other" ? (
                      <input
                        value={customAddressLabel}
                        onChange={(event) => setCustomAddressLabel(event.target.value)}
                        maxLength={64}
                        className={inputClass}
                        placeholder={t("Custom label (optional)")}
                        aria-label={t("Custom address label")}
                      />
                    ) : null}
                  </div>
                  <Field label={t("Address line 1")}><input value={draft.line1} onChange={(event) => setDraft((value) => ({ ...value, line1: event.target.value }))} maxLength={255} required className={inputClass} /></Field>
                  <Field label={t("Address line 2")}><input value={draft.line2} onChange={(event) => setDraft((value) => ({ ...value, line2: event.target.value }))} maxLength={255} className={inputClass} /></Field>
                  <Field label={t("City")}><input value={draft.city} onChange={(event) => setDraft((value) => ({ ...value, city: event.target.value }))} maxLength={128} required className={inputClass} /></Field>
                  <Field label={t("State")}><input value={draft.state} onChange={(event) => setDraft((value) => ({ ...value, state: event.target.value }))} maxLength={128} required className={inputClass} /></Field>
                  <div className="grid grid-cols-[1fr_100px] gap-3"><Field label={t("Pincode")}><input value={draft.pincode} onChange={(event) => setDraft((value) => ({ ...value, pincode: event.target.value }))} maxLength={32} required className={inputClass} /></Field><Field label={t("Country")}><input value={draft.countryCode} onChange={(event) => setDraft((value) => ({ ...value, countryCode: event.target.value.toUpperCase() }))} minLength={2} maxLength={2} required className={inputClass} /></Field></div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2"><input type="checkbox" checked={draft.isDefault} onChange={(event) => setDraft((value) => ({ ...value, isDefault: event.target.checked }))} className="h-4 w-4 accent-[var(--theme-primary)]" />{t("Make this my default address")}</label>
                  <div className="sm:col-span-2"><button disabled={busyAction === (editingAddressId ? `address-${editingAddressId}` : "new-address")} className="rounded-xl bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{t("Save address")}</button></div>
                </form>
              ) : null}

              {profile.addresses.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center"><MapPin className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 font-semibold text-slate-800">{t("No address added")}</p><p className="mt-1 text-sm text-slate-500">{t("Add a delivery address for checkout.")}</p></div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {profile.addresses.map((address) => (
                    <article key={address.id} className={`rounded-2xl border p-4 ${address.isDefault ? "border-[var(--theme-primary)]/40 bg-[var(--theme-primary)]/5" : "border-slate-200"}`}>
                      <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-950">{address.label?.trim() || t("Address")}</h3>{address.isDefault ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700"><CheckCircle2 className="h-3 w-3" />{t("Default")}</span> : null}</div><p className="mt-2 text-sm leading-6 text-slate-600">{addressText(address)}</p></div><CreditCard className="h-5 w-5 shrink-0 text-slate-400" /></div>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200/70 pt-3"><button type="button" onClick={() => openAddressEditor(address)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white">{t("Edit")}</button>{!address.isDefault ? <button type="button" disabled={busyAction === `default-${address.id}`} onClick={() => setDefaultAddress(address.id)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--theme-primary)] hover:bg-white disabled:opacity-50">{t("Set as default")}</button> : null}<button type="button" disabled={busyAction === `delete-${address.id}`} onClick={() => deleteAddress(address)} className="ml-auto rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">{t("Delete")}</button></div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
