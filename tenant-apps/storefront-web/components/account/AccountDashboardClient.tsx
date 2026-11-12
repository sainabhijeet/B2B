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
  variant = "standard",
}: {
  initialProfile: CustomerProfile;
  languageCode: string;
  creditViewEnabled: boolean;
  variant?: "standard" | "materialbridge";
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
    <main className={`min-h-[65vh] bg-[#f1f5f6] pb-20 text-[#0a2c3f] ${variant === "materialbridge" ? "material-account-page" : ""}`}>
      <div className="material-account-shell mx-auto max-w-[1420px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <nav aria-label={t("Breadcrumb")} className="material-account-breadcrumb mb-5 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="font-semibold transition hover:text-[var(--theme-primary)]">{t("Home")}</Link><span aria-hidden="true">/</span><span className="font-bold text-[#0a2c3f]">{t("My account")}</span>
        </nav>

        <section className="material-account-identity relative overflow-hidden rounded-[30px] bg-[#082f45] px-5 py-7 text-white shadow-[0_22px_55px_rgba(6,47,69,0.16)] sm:px-8 sm:py-9 lg:px-10">
          <span className="pointer-events-none absolute -right-24 -top-36 h-80 w-80 rounded-full border-[54px] border-[#0b5878]/40" aria-hidden="true" />
          <span className="pointer-events-none absolute bottom-0 right-[28%] h-1 w-36 bg-[#19a2d5]" aria-hidden="true" />

          <div className="material-account-identity-inner relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="material-account-person flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="material-account-avatar relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
                {profile.profileImageUrl ? (
                  // Signed private customer images are intentionally loaded directly.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.profileImageUrl} alt={profile.name || t("Customer")} className="h-full w-full rounded-[24px] border-4 border-white/20 bg-white object-cover shadow-xl" />
                ) : <span className="flex h-full w-full items-center justify-center rounded-[24px] border border-white/20 bg-white/10 text-4xl font-black text-white shadow-xl backdrop-blur">{initials}</span>}
                <button type="button" onClick={() => avatarInput.current?.click()} disabled={busyAction === "avatar"} aria-label={t("Update profile photo")} className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#19a2d5] text-white shadow-lg transition hover:bg-[#1592c0] disabled:opacity-60"><Camera className="h-4 w-4" /></button>
                <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={uploadAvatar} />
              </div>

              <div className="material-account-person-copy">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#76d2f3]">{t("Trade account workspace")}</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{profile.name || t("Customer")}</h1>
                <p className="mt-2 text-sm text-white/65">{profile.mobile || t("Mobile not available")}{profile.email ? ` · ${profile.email}` : ""}</p>
                <button type="button" onClick={() => setProfileEditorOpen((value) => !value)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#082f45] transition hover:bg-[#e9f6fb]"><Pencil className="h-4 w-4" />{t("Edit profile")}</button>
              </div>
            </div>

            <div className="material-account-routes grid grid-cols-2 gap-3 sm:flex">
              <Link href="/orders" className="group flex min-w-36 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur transition hover:bg-white/15"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#19a2d5] text-white"><Package className="h-4 w-4" /></span><span><b className="block text-sm">{t("Orders")}</b><small className="text-[10px] text-white/55">{t("Track purchases")}</small></span></Link>
              <Link href="/wishlist" className="group flex min-w-36 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur transition hover:bg-white/15"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white"><Heart className="h-4 w-4" /></span><span><b className="block text-sm">{t("Wishlist")}</b><small className="text-[10px] text-white/55">{t("Saved products")}</small></span></Link>
            </div>
          </div>
        </section>

        {notice ? <div role={notice.type === "error" ? "alert" : "status"} className={`material-account-notice mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.text}</div> : null}

        <div className="material-account-grid mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="material-account-record space-y-7">
            {profileEditorOpen ? (
              <section className="material-account-editor rounded-[24px] border border-[#b9d5df] bg-white p-5 shadow-[0_14px_36px_rgba(6,47,69,0.06)] sm:p-7">
                <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-primary)]">{t("Profile settings")}</p><h2 className="mt-1 text-xl font-black text-[#0a2c3f]">{t("Edit profile")}</h2></div><button type="button" onClick={() => setProfileEditorOpen(false)} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900">{t("Cancel")}</button></div>
                <form onSubmit={saveProfile} className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label={t("Name")}><input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} required className={inputClass} /></Field>
                  <Field label={t("Email")}><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" maxLength={255} className={inputClass} placeholder={t("Email not added")} /></Field>
                  <div className="sm:col-span-2"><button disabled={busyAction === "profile"} className="rounded-xl bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busyAction === "profile" ? t("Saving…") : t("Save profile")}</button></div>
                </form>
              </section>
            ) : null}

            <section className="material-account-contact rounded-[24px] border border-[#d4e1e5] bg-white p-5 shadow-[0_12px_34px_rgba(6,47,69,0.05)] sm:p-7">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f3f8] text-[var(--theme-primary)]"><UserRound className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0a2c3f]">{t("Contact details")}</h2><p className="mt-0.5 text-xs text-slate-500">{t("Information used for order updates and account support.")}</p></div></div>
              <dl className="mt-6 divide-y divide-[#e1e9ec] border-y border-[#e1e9ec]">
                <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><dt className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500"><Phone className="h-4 w-4 text-[var(--theme-primary)]" />{t("Mobile number")}</dt><dd className="font-bold text-[#0a2c3f]">{profile.mobile || t("Not available")}</dd></div>
                <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"><dt className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500"><Mail className="h-4 w-4 text-[var(--theme-primary)]" />{t("Email address")}</dt><dd className="break-all font-bold text-[#0a2c3f]">{profile.email || t("Not added")}</dd></div>
              </dl>
            </section>

            <section className="material-account-addresses rounded-[24px] border border-[#d4e1e5] bg-white p-5 shadow-[0_12px_34px_rgba(6,47,69,0.05)] sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f3f8] text-[var(--theme-primary)]"><MapPin className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-[#0a2c3f]">{t("Delivery addresses")}</h2><p className="mt-0.5 text-xs text-slate-500">{profile.addresses.length} {t(profile.addresses.length === 1 ? "saved location" : "saved locations")}</p></div></div><button type="button" onClick={openNewAddress} className="inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(8,121,173,0.18)] hover:brightness-95"><Plus className="h-4 w-4" />{t("Add address")}</button></div>

              {addressEditorOpen ? (
                <form onSubmit={saveAddress} className="mt-6 grid gap-4 rounded-2xl border border-[var(--theme-primary)]/20 bg-[#f4f8f9] p-4 sm:grid-cols-2 sm:p-5">
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
                <div className="mt-6 rounded-[20px] border border-dashed border-[#b9d1da] bg-[#f7fafb] p-10 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#7d9aaa] shadow-sm"><MapPin className="h-6 w-6" /></span><p className="mt-4 font-bold text-[#0a2c3f]">{t("No delivery address yet")}</p><p className="mt-1 text-sm text-slate-500">{t("Add a location now for a faster checkout later.")}</p></div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {profile.addresses.map((address) => (
                    <article key={address.id} className={`rounded-2xl border p-5 ${address.isDefault ? "border-[var(--theme-primary)]/40 bg-[var(--theme-primary)]/5" : "border-[#d9e4e8] bg-[#fafcfc]"}`}>
                      <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-950">{address.label?.trim() || t("Address")}</h3>{address.isDefault ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700"><CheckCircle2 className="h-3 w-3" />{t("Default")}</span> : null}</div><p className="mt-2 text-sm leading-6 text-slate-600">{addressText(address)}</p></div><CreditCard className="h-5 w-5 shrink-0 text-slate-400" /></div>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200/70 pt-3"><button type="button" onClick={() => openAddressEditor(address)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white">{t("Edit")}</button>{!address.isDefault ? <button type="button" disabled={busyAction === `default-${address.id}`} onClick={() => setDefaultAddress(address.id)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[var(--theme-primary)] hover:bg-white disabled:opacity-50">{t("Set as default")}</button> : null}<button type="button" disabled={busyAction === `delete-${address.id}`} onClick={() => deleteAddress(address)} className="ml-auto rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">{t("Delete")}</button></div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="material-account-aside space-y-6 lg:sticky lg:top-28">
            {creditViewEnabled ? (
              <section className="material-account-credit overflow-hidden rounded-[24px] bg-[#0a3a52] p-6 text-white shadow-[0_18px_44px_rgba(6,47,69,0.16)]">
                <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#78d5f5]"><WalletCards className="h-5 w-5" /></span><Link href="/account/credit" aria-label={t("View ledger and statement")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white"><ReceiptText className="h-4 w-4" /></Link></div>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#78d5f5]">{t("Available trade credit")}</p>
                <p className="mt-2 text-4xl font-black tracking-[-0.045em]">{formatCurrency(available, languageCode, "INR")}</p>

                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#24b5e8] transition-all" style={{ width: `${usedPercent}%` }} /></div>
                <div className="mt-2 flex justify-between text-[10px] text-white/55"><span>{Math.round(usedPercent)}% {t("used")}</span><span>{t("Limit")} {formatCurrency(limit, languageCode, "INR")}</span></div>

                <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5"><div><p className="text-[10px] uppercase tracking-wider text-white/45">{t("Credit limit")}</p><p className="mt-1 text-sm font-bold">{formatCurrency(limit, languageCode, "INR")}</p></div><div><p className="text-[10px] uppercase tracking-wider text-white/45">{t("Outstanding")}</p><p className="mt-1 text-sm font-bold text-[#ffcc8a]">{formatCurrency(outstanding, languageCode, "INR")}</p></div></div>
                <Link href="/account/credit" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-black text-[#0a3a52] transition hover:bg-[#e9f6fb]"><ReceiptText className="h-4 w-4" />{t("View credit statement")}</Link>
              </section>
            ) : null}

            <section className="material-account-quick rounded-[24px] border border-[#d4e1e5] bg-white p-5 shadow-[0_12px_34px_rgba(6,47,69,0.05)]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-primary)]">{t("Quick access")}</p>
              <div className="mt-4 space-y-2">
                <Link href="/orders" className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-[#0a2c3f] transition hover:bg-[#edf5f7]"><span className="flex items-center gap-3"><Package className="h-4 w-4 text-[var(--theme-primary)]" />{t("Your orders")}</span><span aria-hidden="true">→</span></Link>
                <Link href="/wishlist" className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-[#0a2c3f] transition hover:bg-[#edf5f7]"><span className="flex items-center gap-3"><Heart className="h-4 w-4 text-[var(--theme-primary)]" />{t("Saved products")}</span><span aria-hidden="true">→</span></Link>
              </div>
            </section>

            <section className="material-account-access rounded-[24px] border border-[#d4e1e5] bg-white p-5 shadow-[0_12px_34px_rgba(6,47,69,0.05)]">
              <h2 className="text-sm font-black text-[#0a2c3f]">{t("Account access")}</h2>
              <form action="/api/storefront/auth/logout" method="post"><button type="submit" className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><LogOut className="h-4 w-4" />{t("Log out")}</button></form>
              <Link href="/account/delete" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"><Trash2 className="h-4 w-4" />{t("Delete account")}</Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
