"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { PREVIEW_COMMERCE_CHANGED, readPreviewWishlist, type PreviewCommerceItem } from "@/lib/preview-commerce";
import { formatCurrency } from "@/lib/language-consistency";
import { translate } from "@/lib/translation-engine";

export default function PreviewWishlistPageClient({ languageCode, variant = "standard" }: { languageCode: string; variant?: "standard" | "materialbridge" }) {
  const [items, setItems] = useState<PreviewCommerceItem[]>([]);
  const t = (value: string) => translate(value, languageCode);
  const load = () => setItems(readPreviewWishlist());
  useEffect(() => {
    load();
    window.addEventListener(PREVIEW_COMMERCE_CHANGED, load);
    return () => window.removeEventListener(PREVIEW_COMMERCE_CHANGED, load);
  }, []);
  if (variant === "materialbridge") {
    return (
      <main className="material-wishlist-page">
        <div className="material-wishlist-shell">
          <header className="material-wishlist-header">
            <div className="material-wishlist-heading">
              <p>{t("Procurement workspace / saved materials")}</p>
              <h1>{t("Material shortlist board")}</h1>
              <span>{t("Keep candidate chemicals together while you compare grade, pack format and commercial details.")}</span>
            </div>
            <div className="material-wishlist-summary" aria-label={t("Wishlist summary")}>
              <span><FlaskConical aria-hidden="true" />{String(items.length).padStart(2, "0")}</span>
              <div><small>{t("Materials under review")}</small><strong>{t(items.length === 1 ? "One saved candidate" : "Saved candidates")}</strong></div>
              <Link href="/category">{t("Open material index")}<ArrowRight aria-hidden="true" /></Link>
            </div>
          </header>

          {items.length === 0 ? (
            <section className="material-wishlist-empty">
              <span><FlaskConical aria-hidden="true" /></span>
              <div><p>{t("Shortlist register / clear")}</p><h2>{t("No materials saved for review.")}</h2><small>{t("Use the save control on any product to build a focused comparison list.")}</small></div>
              <Link href="/category">{t("Browse material families")}<ArrowRight aria-hidden="true" /></Link>
            </section>
          ) : (
            <section className="material-wishlist-register" aria-label={t("Saved materials")}>
              <div className="material-wishlist-register-head"><span>{t("Material image")}</span><span>{t("Candidate record")}</span><span>{t("Commercial review")}</span></div>
              {items.map((item, index) => (
                <div className="material-wishlist-row" key={item.productId} data-record={String(index + 1).padStart(2, "0")}>
                  <article className="material-shortlist-card">
                    <Link href={`/product/${encodeURIComponent(item.productSlug)}`} className="material-shortlist-image" aria-label={`${t("View")} ${item.productName}`}>
                      {item.image ? <Image src={item.image} alt={item.productName} fill sizes="(max-width: 680px) 90vw, 230px" className="object-contain" unoptimized /> : <span aria-hidden="true"><FlaskConical /></span>}
                    </Link>
                    <div className="material-shortlist-copy">
                      <div className="material-shortlist-eyebrow"><span>{t(item.brand?.trim() || "MaterialBridge catalog")}</span><b>{t("Candidate")} {String(index + 1).padStart(2, "0")}</b></div>
                      <Link href={`/product/${encodeURIComponent(item.productSlug)}`} className="material-shortlist-name">{t(item.productName)}</Link>
                      <p>{t("Saved for grade, pack format and commercial comparison before purchase.")}</p>
                      <dl className="material-shortlist-facts">
                        <div><dt>{t("Material code")}</dt><dd>{item.sku || t("On request")}</dd></div>
                        <div><dt>{t("Review status")}</dt><dd>{t("Shortlisted")}</dd></div>
                        <div><dt>{t("Next check")}</dt><dd>{t("Grade and pack")}</dd></div>
                      </dl>
                    </div>
                    <aside className="material-shortlist-commercial">
                      <div className="material-shortlist-save"><WishlistButton productId={item.productId} productName={item.productName} productSlug={item.productSlug} productImage={item.image} productSku={item.sku} productPrice={item.price} productCurrency={item.currency} productBrand={item.brand} previewMode languageCode={languageCode} initialSaved compact onChange={(saved) => { if (!saved) setItems((current) => current.filter((row) => row.productId !== item.productId)); }} /></div>
                      <p>{t("Current catalog reference")}</p>
                      <strong>{item.price == null ? t("Price on request") : formatCurrency(item.price, languageCode, item.currency)}</strong>
                      <small>{t("Confirm final pack and volume terms on the product page.")}</small>
                      <Link href={`/product/${encodeURIComponent(item.productSlug)}`}>{t("Review material")}<ArrowRight aria-hidden="true" /></Link>
                    </aside>
                  </article>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    );
  }
  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-950">{t("Wishlist")}</h1>
      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="font-semibold text-slate-800">{t("Your wishlist is empty")}</p>
          <Link href="/category" className="mt-5 inline-flex rounded-xl bg-[var(--theme-primary)] px-5 py-3 text-sm font-bold text-white">{t("Browse products")}</Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => <ProductCard key={item.productId} id={item.productId} slug={item.productSlug} name={item.productName} price={item.price} currency={item.currency} image={item.image} brand={item.brand} previewMode languageCode={languageCode} />)}
        </div>
      )}
    </main>
  );
}
