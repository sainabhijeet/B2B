import Link from "next/link";
import Header from "@/sections/Header";
import { getStorefrontLanguage } from "@/lib/storefront-language";
import { translate } from "@/lib/translation-engine";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { formatCurrency } from "@/lib/language-consistency";

const items = [
  { name: "Nova X Pro 5G Smartphone", price: 59999, tag: "Saved deal" },
  { name: "Studio Max Wireless Headphones", price: 9499, tag: "Price dropped" },
  { name: "AeroRun Premium Sneakers", price: 5499, tag: "Limited stock" },
];

export default async function WishlistPage() {
  const language = await getStorefrontLanguage();
  const t = (text: string) => translate(text, language);
  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
    <div className="min-h-screen bg-slate-50">
      <Header logoText="MarketPro" industryName="Wishlist" nav={["Home", "Categories", "Products", "Cart", "Login"]} languageCode={language} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-950">{t("Wishlist")}</h1>
        <p className="mt-2 text-slate-600">{t("Saved products with offers, seller info, and quick cart actions.")}</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <article key={item.name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{t(item.tag)}</span>
              <h2 className="mt-4 min-h-12 text-lg font-bold text-slate-950">{t(item.name)}</h2>
              <p className="mt-2 font-bold text-blue-700">{formatCurrency(item.price, language)}</p>
              <Link href="/cart" className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">
                {t("Move to cart")}
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
    </StorefrontLocaleFrame>
  );
}
