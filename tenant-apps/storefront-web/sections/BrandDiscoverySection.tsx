import Link from "next/link";
import { translate } from "@/lib/translation-engine";
import type { ThemeKey } from "@/lib/theme-config";
import { listStorefrontProducts } from "@/services/productService";

type Props = {
  themeKey?: ThemeKey;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  limit?: number;
  languageCode?: string;
};

export default async function BrandDiscoverySection({ eyebrow, title, subtitle, limit, languageCode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const { products, filters, meta } = await listStorefrontProducts({ limit: 100 });
  const max = typeof limit === "number" && Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 4), 12) : 8;
  const filterBrands = (Array.isArray(filters.brand) ? filters.brand : [])
    .filter((item) => item?.value?.trim())
    .map((item) => ({ slug: item.slug, value: item.value.trim(), count: item.count }));
  const productBrandCounts = new Map<string, number>();
  for (const product of products) {
    const brand = product.brand?.trim();
    if (brand) productBrandCounts.set(brand, (productBrandCounts.get(brand) ?? 0) + 1);
  }
  const inferredBrands = [...productBrandCounts.entries()].map(([value, count]) => ({
    slug: value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, ""),
    value,
    count: productBrandCounts.size === 1 && products.length === meta.limit ? meta.total : count,
  }));
  const brands = (filterBrands.length ? filterBrands : inferredBrands).sort((a, b) => b.count - a.count).slice(0, max);

  if (brands.length === 0) return null;

  return (
    <section id="brand-discovery" className="border-y border-slate-200/70 bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--theme-primary)]">
              {t(eyebrow?.trim() || "Shop by brand")}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {t(title?.trim() || "Brands retailers keep coming back to")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {t(subtitle?.trim() || "Explore active brands from the live catalog and compare their available products.")}
            </p>
          </div>
          <Link href="/category" className="inline-flex w-fit items-center gap-1.5 text-xs font-extrabold text-[var(--theme-primary)] hover:underline">
            {t("Browse all brands")}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className={`mt-8 grid gap-3 ${brands.length === 1 ? "max-w-xl grid-cols-1" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"}`}>
          {brands.map((brand, index) => {
            const name = t(brand.value);
            const initials = name.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
            return (
              <Link
                key={`${brand.slug}-${brand.value}`}
                href={`/category?brand=${encodeURIComponent(brand.value)}`}
                className="group flex min-h-36 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition duration-300 hover:-translate-y-1 hover:border-[var(--theme-primary)] hover:bg-white hover:shadow-lg"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black"
                  style={{
                    background: index % 2 === 0
                      ? "color-mix(in srgb, var(--theme-primary) 12%, white)"
                      : "color-mix(in srgb, var(--theme-secondary) 20%, white)",
                    color: "var(--theme-primary)",
                  }}
                  aria-hidden="true"
                >
                  {initials || "B"}
                </span>
                <span className="mt-5">
                  <span className="block truncate text-sm font-extrabold text-slate-900 group-hover:text-[var(--theme-primary)]">{name}</span>
                  <span className="mt-1 block text-[11px] font-medium text-slate-500">
                    {brand.count} {t(brand.count === 1 ? "product" : "products")}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
