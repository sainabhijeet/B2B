"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import OrderProductImage from "@/components/orders/OrderProductImage";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { productImageUrl } from "@/lib/product-image-url";
import { translate } from "@/lib/translation-engine";

export type WishlistItem = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  thumbnailUrl: string | null;
};

export default function WishlistPageClient({ initialItems, languageCode }: {
  initialItems: WishlistItem[];
  languageCode: string;
}) {
  const [items, setItems] = useState(initialItems);
  const t = (value: string) => translate(value, languageCode);

  return (
    <main className="min-h-[70vh] bg-slate-50/80 pb-20">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-indigo-700">{t("Home")}</Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-slate-800">{t("Wishlist")}</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">{t("My account")}</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t("Wishlist")}</h1>
            <p className="mt-2 text-sm text-slate-600">{items.length} {t(items.length === 1 ? "saved product" : "saved products")}</p>
          </div>
          <Link href="/category" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:border-indigo-200 hover:text-indigo-700">{t("Continue shopping")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500"><Heart className="h-8 w-8" aria-hidden="true" /></span>
            <h2 className="mt-5 text-xl font-semibold text-slate-900">{t("Your wishlist is empty")}</h2>
            <p className="mt-2 text-sm text-slate-500">{t("Tap the heart on a product to save it here.")}</p>
            <Link href="/category" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">{t("Browse products")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Link href={`/product/${encodeURIComponent(item.slug)}`} className="relative flex aspect-[4/3] items-center justify-center bg-white p-4 hover:bg-slate-50">
                  <OrderProductImage src={productImageUrl(item.thumbnailUrl)} alt={item.name} sizes="(max-width: 640px) 90vw, 33vw" />
                </Link>
                <div className="p-5">
                  {item.brand ? <p className="text-xs font-semibold text-[var(--theme-primary)]">{t(item.brand)}</p> : null}
                  <Link href={`/product/${encodeURIComponent(item.slug)}`} className="mt-1 line-clamp-2 text-base font-bold text-slate-900 hover:text-indigo-700">{t(item.name)}</Link>
                  <p className="mt-1 text-xs text-slate-500">{t("SKU")}: {item.sku}</p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/product/${encodeURIComponent(item.slug)}`} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-95">{t("View product")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                    <WishlistButton productId={item.id} languageCode={languageCode} initialSaved compact onChange={(saved) => {
                      if (!saved) setItems((current) => current.filter((row) => row.id !== item.id));
                    }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
