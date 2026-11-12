"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/language-consistency";
import {
  PREVIEW_COMMERCE_CHANGED,
  readPreviewCart,
  removePreviewCartItem,
  type PreviewCommerceItem,
  upsertPreviewCart,
} from "@/lib/preview-commerce";
import { translate } from "@/lib/translation-engine";

type PreviewCartVariant = "default" | "material-dossier";

type MaterialDossierProps = {
  items: PreviewCommerceItem[];
  languageCode: string;
  subtotal: number;
  totalUnits: number;
  updateQuantity: (item: PreviewCommerceItem, quantity: number) => void;
  t: (value: string) => string;
};

function MaterialDossierCart({ items, languageCode, subtotal, totalUnits, updateQuantity, t }: MaterialDossierProps) {
  const currency = items[0]?.currency;

  return (
    <main
      className="min-h-[72vh] bg-[#e7f0eb] text-[#0b2926]"
      style={{
        backgroundImage: "linear-gradient(rgba(17,105,68,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(17,105,68,.055) 1px,transparent 1px)",
        backgroundSize: "42px 42px",
      }}
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="border border-[#8eb7a3] bg-[#f8fbf9] shadow-[12px_12px_0_rgba(20,91,61,.10)]">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_440px]">
            <div className="relative px-6 py-8 sm:px-9 lg:px-12 lg:py-10">
              <span className="absolute left-0 top-8 h-16 w-2 bg-[#14843f]" aria-hidden="true" />
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#14843f]">
                {t("Material release register / active cart")}
              </p>
              <h1 className="mt-4 max-w-3xl text-3xl font-black leading-[1.02] tracking-[-0.04em] text-[#0b2926] sm:text-4xl lg:text-[48px]">
                {t("Prepare the materials for commercial release.")}
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#526a65]">
                {t("Review each material record, confirm the required quantity and release the selected pack to checkout.")}
              </p>
            </div>

            <div className="grid grid-cols-2 border-t border-[#b8d0c4] bg-[#edf5f1] lg:border-l lg:border-t-0">
              <div className="border-b border-r border-[#b8d0c4] p-6">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#5e7770]">{t("Material records")}</span>
                <strong className="mt-3 block text-3xl font-black text-[#0b2926]">{String(items.length).padStart(2, "0")}</strong>
              </div>
              <div className="border-b border-[#b8d0c4] p-6">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#5e7770]">{t("Total units")}</span>
                <strong className="mt-3 block text-3xl font-black text-[#0b2926]">{String(totalUnits).padStart(2, "0")}</strong>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-4 p-6">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#5e7770]">{t("Release status")}</span>
                  <strong className="mt-2 block text-sm text-[#0b2926]">{items.length ? t("Ready for review") : t("Awaiting materials")}</strong>
                </div>
                <span className="flex h-11 w-11 items-center justify-center border border-[#14843f] bg-white text-[#14843f]" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </header>

        {items.length === 0 ? (
          <section className="mt-8 border border-[#8eb7a3] bg-white p-8 text-center sm:p-12">
            <span className="mx-auto flex h-16 w-16 items-center justify-center border border-[#14843f] bg-[#edf5f1] text-3xl text-[#14843f]" aria-hidden="true">+</span>
            <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#14843f]">{t("Register clear")}</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-[#0b2926]">{t("No materials are queued yet.")}</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#5e7770]">{t("Browse the material index and add the pack formats needed for your next order.")}</p>
            <Link href="/category" className="mt-7 inline-flex min-h-12 items-center justify-center bg-[#14843f] px-7 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#0d6c32]">
              {t("Open material index")} <span className="ml-3" aria-hidden="true">→</span>
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <section className="border border-[#8eb7a3] bg-white" aria-label={t("Cart products")}>
              <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 bg-[#0b4b32] px-5 text-white sm:px-7">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ed0b4]">{t("Candidate materials")}</span>
                  <strong className="ml-3 text-sm">{items.length}</strong>
                </div>
                <span className="hidden font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#9ed0b4] sm:block">{t("Pack · quantity · commercial reference")}</span>
              </div>

              <div className="grid grid-cols-1 gap-5 bg-[#e7f0eb] p-5 sm:grid-cols-2 2xl:grid-cols-3">
                {items.map((item, index) => {
                  const lineTotal = (item.price ?? 0) * item.quantity;
                  return (
                    <article key={`${item.productId}:${item.variantId}`} className="flex min-w-0 flex-col border border-[#8eb7a3] bg-white shadow-[7px_8px_0_rgba(20,91,61,.10)]">
                      <div className="relative overflow-hidden border-b border-[#8eb7a3] bg-[#dcebe3] p-5">
                        <span className="absolute left-[12%] top-[-16%] h-[110%] w-[76%] rounded-full bg-[#eef6f2]" aria-hidden="true" />
                        <span className="absolute left-4 top-4 z-20 flex h-10 min-w-10 items-center justify-center border-4 border-white bg-[#14843f] px-2 font-mono text-[10px] font-bold text-white shadow-sm">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePreviewCartItem(item.productId, item.variantId)}
                          className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[#ef8e95] bg-white text-[#e84251] shadow-[0_5px_16px_rgba(184,35,48,.16)] transition hover:bg-[#fff1f2]"
                          aria-label={t("Remove record")}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                        <div className="relative z-10 flex h-[250px] items-center justify-center">
                          {item.image ? (
                            <Image src={item.image} alt={item.productName} width={360} height={360} unoptimized className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-xs text-[#789087]">{t("No image available")}</span>
                          )}
                        </div>
                        <p className="relative z-10 -mb-1 mt-3 inline-flex border-l-2 border-[#14843f] bg-white px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#557068]">
                          {t("Release pack / reference view")}
                        </p>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col p-5">
                        <div className="min-w-0">
                          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#14843f]">{item.brand || t("MaterialBridge")}</p>
                          <Link href={`/product/${encodeURIComponent(item.productSlug)}`} className="mt-3 block text-xl font-black leading-[1.15] tracking-[-0.025em] text-[#0b2926] hover:text-[#14843f]">
                            {t(item.productName)}
                          </Link>
                          <p className="mt-3 min-h-10 text-xs leading-5 text-[#5e7770]">{t("Selected for pack, quantity and commercial review before checkout.")}</p>
                        </div>

                        <div className="mt-5 grid grid-cols-3 border border-[#b8d0c4]">
                          <div className="border-r border-[#b8d0c4] p-3">
                            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#6b817a]">{t("Material code")}</span>
                            <strong className="mt-2 block truncate text-[10px] text-[#0b2926]">{item.sku || "—"}</strong>
                          </div>
                          <div className="border-r border-[#b8d0c4] p-3">
                            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#6b817a]">{t("Pack status")}</span>
                            <strong className="mt-2 block text-[10px] text-[#0b2926]">{t("Selected")}</strong>
                          </div>
                          <div className="p-3">
                            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[#6b817a]">{t("Next check")}</span>
                            <strong className="mt-2 block text-[10px] text-[#0b2926]">{t("Grade and pack")}</strong>
                          </div>
                        </div>

                        <div className="mt-5 border-t border-[#b8d0c4] bg-[#edf5f1] p-4">
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#6b817a]">{t("Required quantity")}</span>
                              <div className="mt-2 inline-grid h-10 grid-cols-[36px_50px_36px] border border-[#8eb7a3] bg-white">
                              <button type="button" onClick={() => updateQuantity(item, item.quantity - 1)} className="text-lg text-[#14843f] transition hover:bg-[#edf5f1]" aria-label={t("Decrease quantity")}>−</button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(event) => updateQuantity(item, Number.parseInt(event.target.value, 10) || 1)}
                                className="w-full border-x border-[#b8d0c4] bg-transparent text-center text-sm font-black outline-none"
                                aria-label={t("Quantity")}
                              />
                              <button type="button" onClick={() => updateQuantity(item, item.quantity + 1)} className="text-lg text-[#14843f] transition hover:bg-[#edf5f1]" aria-label={t("Increase quantity")}>+</button>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#6b817a]">{t("Current reference")}</span>
                              <strong className="mt-2 block text-xl font-black text-[#14843f]">{formatCurrency(lineTotal, languageCode, item.currency)}</strong>
                            </div>
                          </div>
                          <Link href={`/product/${encodeURIComponent(item.productSlug)}`} className="mt-4 flex min-h-11 items-center justify-between bg-[#14843f] px-4 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#0d6c32]">
                            {t("Review material")} <span className="text-lg" aria-hidden="true">→</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="border border-[#8eb7a3] bg-[#f8fbf9] xl:sticky xl:top-6">
              <div className="bg-[#0b4b32] px-7 py-6 text-white">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ed0b4]">{t("Commercial release")}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">{t("Order control")}</h2>
              </div>
              <div className="p-7">
                <div className="border-b border-[#b8d0c4] pb-6">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#6b817a]">{t("Materials subtotal")}</span>
                  <strong className="mt-3 block text-4xl font-black tracking-[-0.04em] text-[#14843f]">{formatCurrency(subtotal, languageCode, currency)}</strong>
                </div>
                <dl className="divide-y divide-[#c5d9cf] text-sm">
                  <div className="flex justify-between gap-4 py-4"><dt className="text-[#5e7770]">{t("Material records")}</dt><dd className="font-bold">{items.length}</dd></div>
                  <div className="flex justify-between gap-4 py-4"><dt className="text-[#5e7770]">{t("Required units")}</dt><dd className="font-bold">{totalUnits}</dd></div>
                  <div className="flex justify-between gap-4 py-4"><dt className="text-[#5e7770]">{t("Tax and delivery")}</dt><dd className="font-bold">{t("At checkout")}</dd></div>
                </dl>
                <Link href="/checkout" className="mt-5 flex min-h-14 items-center justify-between bg-[#14843f] px-5 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#0d6c32]">
                  {t("Release to checkout")} <span className="text-lg" aria-hidden="true">→</span>
                </Link>
                <Link href="/category" className="mt-3 flex min-h-12 items-center justify-center border border-[#8eb7a3] bg-white px-5 text-xs font-black uppercase tracking-[0.1em] text-[#0b4b32] transition hover:bg-[#edf5f1]">
                  <span className="mr-3" aria-hidden="true">←</span> {t("Continue sourcing")}
                </Link>
                <p className="mt-6 border-l-2 border-[#14843f] pl-4 text-xs leading-5 text-[#657d75]">
                  {t("Final availability, tax and delivery terms are confirmed during checkout.")}
                </p>
              </div>
            </aside>
          </div>
        )}

        <section className="mt-6 grid border border-[#8eb7a3] bg-[#f8fbf9] md:grid-cols-3" aria-label={t("Release checks")}>
          {[
            ["01", t("Material identified"), t("Product and material code recorded")],
            ["02", t("Quantity planned"), t("Required pack volume confirmed")],
            ["03", t("Commercial review"), t("Final terms checked at checkout")],
          ].map(([number, title, copy], index) => (
            <div key={number} className={`flex gap-4 p-5 ${index < 2 ? "border-b border-[#b8d0c4] md:border-b-0 md:border-r" : ""}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#8eb7a3] font-mono text-[10px] font-bold text-[#14843f]">{number}</span>
              <div><strong className="block text-sm text-[#0b2926]">{title}</strong><span className="mt-1 block text-xs leading-5 text-[#6b817a]">{copy}</span></div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

export default function PreviewCartPageClient({ languageCode, variant = "default" }: { languageCode: string; variant?: PreviewCartVariant }) {
  const [items, setItems] = useState<PreviewCommerceItem[]>([]);
  const t = (value: string) => translate(value, languageCode);
  const load = () => setItems(readPreviewCart());

  useEffect(() => {
    load();
    window.addEventListener(PREVIEW_COMMERCE_CHANGED, load);
    return () => window.removeEventListener(PREVIEW_COMMERCE_CHANGED, load);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const updateQuantity = (item: PreviewCommerceItem, quantity: number) => upsertPreviewCart({ ...item, quantity: Math.max(1, quantity) });

  if (variant === "material-dossier") {
    return <MaterialDossierCart items={items} languageCode={languageCode} subtotal={subtotal} totalUnits={totalUnits} updateQuantity={updateQuantity} t={t} />;
  }

  return (
    <main className="storefront-cart-page min-h-[70vh] bg-slate-50">
      <div className="cart-page-inner mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="cart-page-intro flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-7">
          <div><h1 className="text-3xl font-bold tracking-tight text-slate-950">{t("Your cart")}</h1><p className="mt-2 text-sm text-slate-600">{items.length ? `${items.length} ${t(items.length === 1 ? "product" : "products")} · ${totalUnits} ${t(totalUnits === 1 ? "unit" : "units")}` : t("Build a shortlist for your next order.")}</p></div>
          <Link href="/category" className="text-sm font-semibold text-[var(--theme-primary)] hover:underline">← {t("Continue shopping")}</Link>
        </header>

        {items.length === 0 ? (
          <section className="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl" aria-hidden="true">+</span><h2 className="mt-5 text-xl font-bold text-slate-950">{t("Your cart is empty.")}</h2><p className="mt-2 text-sm text-slate-600">{t("Explore products and add the items you need.")}</p><Link href="/category" className="mt-6 inline-flex rounded-xl bg-[var(--theme-primary)] px-6 py-3 text-sm font-bold text-white">{t("Browse products")}</Link></section>
        ) : (
          <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-label={t("Cart products")}>
              <div className="divide-y divide-slate-100">
                {items.map((item) => (
                  <article key={`${item.productId}:${item.variantId}`} className="grid gap-5 py-5 sm:grid-cols-[150px_1fr]">
                    <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-slate-50">{item.image ? <Image src={item.image} alt={item.productName} width={200} height={200} unoptimized className="h-full w-full object-cover" /> : <span className="text-xs text-slate-400">{t("No image available")}</span>}</div>
                    <div><div className="flex justify-between gap-4"><div><Link href={`/product/${encodeURIComponent(item.productSlug)}`} className="font-bold text-slate-900">{t(item.productName)}</Link><p className="mt-1 text-xs text-slate-500">{t("SKU")}: {item.sku || "—"}</p></div><strong>{formatCurrency((item.price ?? 0) * item.quantity, languageCode, item.currency)}</strong></div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><label className="text-xs font-semibold text-slate-600">{t("Quantity")}<input type="number" min="1" value={item.quantity} onChange={(event) => updateQuantity(item, Number.parseInt(event.target.value, 10) || 1)} className="ml-2 w-16 rounded-lg border border-slate-300 px-2 py-2 text-center" /></label><button type="button" onClick={() => removePreviewCartItem(item.productId, item.variantId)} className="text-xs font-bold text-rose-600">{t("Remove")}</button></div></div>
                  </article>
                ))}
              </div>
            </section>
            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold text-slate-950">{t("Order summary")}</h2><div className="mt-6 flex justify-between border-b border-slate-200 pb-5 text-sm"><span>{t("Subtotal")}</span><strong>{formatCurrency(subtotal, languageCode)}</strong></div><Link href="/checkout" className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">{t("Proceed to checkout")}</Link></aside>
          </div>
        )}
      </div>
    </main>
  );
}
