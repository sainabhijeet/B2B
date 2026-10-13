import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";
import { listCategories } from "@/services/categoryService";
import { listStorefrontProducts } from "@/services/productService";

type Props = {
  themeKey?: ThemeKey;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  languageCode?: string;
};

export default async function CatalogHighlightsSection({ eyebrow, title, subtitle, languageCode }: Props) {
  const [{ products, meta }, categories] = await Promise.all([
    listStorefrontProducts({ limit: 72 }),
    listCategories(),
  ]);
  const brands = new Set(products.map((product) => product.brand?.trim()).filter(Boolean));
  const t = (text: string) => translate(text, languageCode);
  const highlights = [
    { value: String(meta.total), label: "Live products", detail: "Ready to browse and order" },
    { value: String(categories.length), label: "Buying categories", detail: "Organised for faster sourcing" },
    { value: String(brands.size), label: "Verified brand", detail: "Consistent professional quality" },
    { value: products.length > 0 ? "LIVE" : "SOON", label: "Catalog status", detail: "Stock and pricing sync enabled" },
  ];

  return (
    <section className="border-y border-slate-200 bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            {eyebrow?.trim() ? (
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--theme-primary)]">{t(eyebrow.trim())}</p>
            ) : null}
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {t(title?.trim() || "A live catalog built for beauty retailers")}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            {t(subtitle?.trim() || "Explore current products and categories available from this store.")}
          </p>
        </div>
        <dl className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <dd className="text-3xl font-black tracking-tight text-[var(--theme-primary)]">{item.value}</dd>
              <dt className="mt-2 text-sm font-bold text-slate-950">{t(item.label)}</dt>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t(item.detail)}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
