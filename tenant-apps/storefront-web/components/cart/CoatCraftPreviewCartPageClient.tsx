"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import CartEmptyWorkspace from "@/components/cart/CartEmptyWorkspace";
import { formatCurrency } from "@/lib/language-consistency";
import { PREVIEW_COMMERCE_CHANGED, readPreviewCart, removePreviewCartItem, type PreviewCommerceItem, upsertPreviewCart } from "@/lib/preview-commerce";
import { translate } from "@/lib/translation-engine";

export default function CoatCraftPreviewCartPageClient({ languageCode }: { languageCode: string }) {
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

  function updateQuantity(item: PreviewCommerceItem, quantity: number) {
    upsertPreviewCart({ ...item, quantity: Math.max(1, quantity) });
  }

  return (
    <main className="storefront-cart-page min-h-[70vh] bg-[#f5f7f7] text-[#09283b]">
      <div className="mx-auto max-w-[1420px] px-5 py-9 sm:px-8 lg:px-10 lg:py-12">
        <header className="flex flex-col gap-7 border-b border-[#d6e2e6] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/category" className="inline-flex items-center gap-2 text-xs font-bold text-[#0879ad] transition hover:text-[#055f88]"><span aria-hidden="true">←</span>{t("Continue shopping")}</Link>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">{t("Shopping cart")}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{items.length > 0 ? `${items.length} ${t(items.length === 1 ? "product" : "products")} · ${totalUnits} ${t(totalUnits === 1 ? "unit" : "units")} ${t("ready for review")}` : t("Your product shortlist is ready to begin.")}</p>
          </div>

          <ol className="flex max-w-md items-center" aria-label={t("Checkout progress")}>
            {[["1", "Cart", true], ["2", "Checkout", false], ["3", "Complete", false]].map(([number, label, current], index) => (
              <li key={String(label)} className="flex items-center">
                {index > 0 ? <span className="mx-2 h-px w-7 bg-[#c8d8de] sm:w-12" aria-hidden="true" /> : null}
                <span className="flex items-center gap-2">
                  <b className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${current ? "bg-[#0879ad] text-white" : "border border-[#bdcfd6] bg-white text-slate-400"}`}>{number}</b>
                  <span className={`hidden text-xs font-bold sm:inline ${current ? "text-[#09283b]" : "text-slate-400"}`}>{t(String(label))}</span>
                </span>
              </li>
            ))}
          </ol>
        </header>

        {items.length === 0 ? <CartEmptyWorkspace languageCode={languageCode} /> : (
          <>
            <div className="mt-8 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_400px]">
              <section aria-label={t("Cart products")}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-xl font-black tracking-[-0.025em]">{t("Your products")}</h2>
                  <span className="rounded-full bg-[#e3eef2] px-3.5 py-1.5 text-xs font-bold text-[#416576]">{totalUnits} {t(totalUnits === 1 ? "unit" : "units")}</span>
                </div>

                <div className="space-y-4">
                  {items.map((item) => (
                    <article key={`${item.productId}:${item.variantId}`} className="group relative overflow-hidden rounded-[20px] border border-[#d5e1e5] bg-white p-4 shadow-[0_10px_30px_rgba(6,47,69,0.045)] transition duration-300 hover:border-[#aac9d5] hover:shadow-[0_18px_42px_rgba(6,47,69,0.085)] sm:p-5">
                      <span className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-[#0a84b8] opacity-0 transition group-hover:opacity-100" aria-hidden="true" />

                      <div className="grid gap-5 md:grid-cols-[164px_minmax(0,1fr)] md:items-stretch">
                        <div className="flex min-h-44 items-center justify-center overflow-hidden rounded-2xl bg-[#f0f4f5] p-3 sm:min-h-48">
                          {item.image ? <Image src={item.image} alt={item.productName} width={280} height={280} unoptimized className="h-40 w-full object-contain transition duration-500 group-hover:scale-[1.025] sm:h-44" /> : <span className="text-xs text-slate-400">{t("No image available")}</span>}
                        </div>

                        <div className="flex min-w-0 flex-col justify-between py-1">
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <span className="text-[10px] font-black uppercase tracking-[0.17em] text-[#0879ad]">{t("Professional coating")}</span>
                              <Link href={`/product/${encodeURIComponent(item.productSlug)}`} className="mt-2 block text-xl font-black leading-[1.18] tracking-[-0.03em] transition hover:text-[#0879ad] sm:text-[23px]">{t(item.productName)}</Link>
                              <p className="mt-2 text-xs font-medium text-slate-500">{t("SKU")}: <span className="text-[#416273]">{item.sku || "—"}</span></p>
                            </div>

                            <div className="shrink-0 lg:min-w-40 lg:text-right">
                              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{t("Item total")}</p>
                              <p className="mt-1 text-[26px] font-black tracking-[-0.045em] text-[#09283b]">{formatCurrency((item.price ?? 0) * item.quantity, languageCode, item.currency)}</p>
                              <p className="mt-1 text-[11px] text-slate-500">{formatCurrency(item.price ?? 0, languageCode, item.currency)} {t("per unit")}</p>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-col gap-4 border-t border-[#e1e9ec] pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#52705a]">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e7f3e9] text-[11px] font-black text-[#56805d]" aria-hidden="true">✓</span>
                              {t("Available for order review")}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <label className="sr-only" htmlFor={`cart-quantity-${item.productId}-${item.variantId}`}>{t("Quantity")}</label>
                              <div className="flex h-10 items-center overflow-hidden rounded-xl border border-[#c2d3d9] bg-white shadow-sm">
                                <button type="button" aria-label={t("Decrease quantity")} disabled={item.quantity <= 1} onClick={() => updateQuantity(item, item.quantity - 1)} className="h-full w-10 text-base text-[#416273] transition hover:bg-[#edf4f6] disabled:opacity-35">−</button>
                                <input id={`cart-quantity-${item.productId}-${item.variantId}`} type="number" min="1" aria-label={t("Quantity")} value={item.quantity} onChange={(event) => updateQuantity(item, Number.parseInt(event.target.value, 10) || 1)} className="h-full w-12 border-x border-[#d7e2e6] bg-transparent text-center text-sm font-black outline-none" />
                                <button type="button" aria-label={t("Increase quantity")} onClick={() => updateQuantity(item, item.quantity + 1)} className="h-full w-10 text-base text-[#416273] transition hover:bg-[#edf4f6]">+</button>
                              </div>
                              <button type="button" onClick={() => removePreviewCartItem(item.productId, item.variantId)} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" /></svg>
                                {t("Remove")}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="h-fit rounded-[26px] border border-[#d3e0e5] bg-white p-6 shadow-[0_22px_55px_rgba(6,47,69,0.09)] sm:p-7 xl:sticky xl:top-32">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-sm font-bold text-[#0879ad]">{t("Order summary")}</p><h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">{t("Review your total")}</h2></div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5f1f5] text-[#0879ad]" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2 10h10l2-7H6m3 11h.01M17 18h.01" /></svg></span>
                </div>

                <dl className="mt-7 space-y-4 text-sm">
                  <div className="flex justify-between gap-4 text-slate-600"><dt>{t("Product total")} ({totalUnits})</dt><dd className="font-bold text-[#09283b]">{formatCurrency(subtotal, languageCode)}</dd></div>
                  <div className="flex justify-between gap-4 text-slate-600"><dt>{t("Shipping")}</dt><dd className="text-right text-xs">{t("Calculated at checkout")}</dd></div>
                  <div className="flex justify-between gap-4 text-slate-600"><dt>{t("Taxes")}</dt><dd className="text-right text-xs">{t("Calculated at checkout")}</dd></div>
                </dl>

                <div className="my-6 h-px bg-[#dbe6ea]" />
                <div className="flex items-end justify-between gap-5"><span className="text-base font-bold">{t("Subtotal")}</span><span className="text-3xl font-black tracking-[-0.045em]">{formatCurrency(subtotal, languageCode)}</span></div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{t("Final availability, delivery and payable amount are confirmed at checkout.")}</p>

                <Link href="/checkout" className="mt-6 flex min-h-[54px] w-full items-center justify-center rounded-xl bg-[#0879ad] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(8,121,173,0.24)] transition hover:bg-[#056d9d]">{t("Proceed to checkout")}<span className="ml-3" aria-hidden="true">→</span></Link>
                <div className="mt-5 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-[#5b8d64]" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6V10Z" /></svg>{t("Secure account checkout")}</div>

                <div className="mt-6 rounded-2xl bg-[#eef5f7] p-4">
                  <p className="text-sm font-bold">{t("Ordering in volume?")}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{t("Share your quantities with the buying desk for commercial review.")}</p>
                  <Link href="/bulk-orders" className="mt-3 inline-flex text-xs font-black text-[#0879ad] hover:underline">{t("Plan a bulk order")} <span className="ml-2" aria-hidden="true">→</span></Link>
                </div>
              </aside>
            </div>

            <section className="mt-8 grid gap-4 rounded-[22px] border border-[#d7e3e7] bg-white p-5 sm:grid-cols-3 sm:p-6" aria-label={t("Order benefits")}>
              {[["✓", "Easy changes", "Edit quantities before checkout"], ["⌁", "Clear review", "See the complete order total"], ["?", "Buyer support", "Help for larger requirements"]].map(([icon, title, copy]) => (
                <div key={title} className="flex items-center gap-4 sm:border-r sm:border-[#dce6e9] sm:last:border-r-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7f2f5] text-sm font-black text-[#0879ad]">{icon}</span>
                  <div><strong className="block text-sm font-black">{t(title)}</strong><span className="mt-1 block text-xs text-slate-500">{t(copy)}</span></div>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
