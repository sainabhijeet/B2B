import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import CatalogSortControl from "@/components/catalog/CatalogSortControl";
import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";
import { listCategories } from "@/services/categoryService";
import { listStorefrontProducts, type StorefrontListParams } from "@/services/productService";

type SearchValues = Record<string, string | string[] | undefined>;

type Props = {
  languageCode: string;
  themeKey: ThemeKey;
  selectedSlug?: string;
  searchParams: SearchValues;
};

const SORT_VALUES = ["newest", "best_selling", "price_asc", "price_desc"] as const;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

function safePrice(value: string): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function safePage(value: string): number {
  const page = Number.parseInt(value, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function values(value: string | string[] | undefined): string[] {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function CategoryBrowse({ languageCode, themeKey, selectedSlug, searchParams }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const categories = await listCategories();
  const activeCategory = selectedSlug ? categories.find((item) => item.slug === selectedSlug) : undefined;
  if (selectedSlug && !activeCategory) notFound();

  const path = activeCategory ? `/category/${encodeURIComponent(activeCategory.slug)}` : "/category";
  const query = first(searchParams.q);
  const brand = first(searchParams.brand);
  const minimum = safePrice(first(searchParams.min_price));
  const maximum = safePrice(first(searchParams.max_price));
  const inStock = first(searchParams.in_stock) === "true" || first(searchParams.in_stock) === "1";
  const sortRaw = first(searchParams.sort);
  const sort = SORT_VALUES.find((item) => item === sortRaw) ?? "newest";
  const page = safePage(first(searchParams.page));

  const facetKeys = Object.keys(searchParams).filter(
    (key) => !["tenant", "tenantId", "q", "brand", "min_price", "max_price", "in_stock", "sort", "page"].includes(key) && /^[a-z0-9_-]+$/i.test(key),
  );
  const facetParams = Object.fromEntries(facetKeys.map((key) => [key, values(searchParams[key]).join(",")]).filter(([, value]) => value));
  const productParams: StorefrontListParams = {
    ...(activeCategory ? { category: activeCategory.slug } : {}),
    ...(query ? { q: query } : {}),
    ...(brand ? { brand } : {}),
    ...(minimum !== undefined ? { min_price: minimum } : {}),
    ...(maximum !== undefined ? { max_price: maximum } : {}),
    ...(inStock ? { in_stock: true } : {}),
    sort,
    page,
    limit: 24,
    ...facetParams,
  };
  const result = await listStorefrontProducts(productParams);
  const facets = Object.entries(result.filters).filter(([key, options]) => /^[a-z0-9_-]+$/i.test(key) && Array.isArray(options) && options.length > 0);
  const brandSuggestions = [...new Set(result.products.map((product) => product.brand).filter((item): item is string => Boolean(item)))].sort();

  const currentParams = new URLSearchParams();
  for (const key of ["tenant", "tenantId", "q", "brand", "min_price", "max_price", "in_stock", "sort"]) {
    const value = first(searchParams[key]);
    if (value) currentParams.set(key, value);
  }
  for (const key of facetKeys) {
    const selected = values(searchParams[key]);
    if (selected.length) currentParams.set(key, selected.join(","));
  }
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams(currentParams);
    params.set("page", String(nextPage));
    return `${path}?${params.toString()}`;
  };
  const filterCount = Number(Boolean(brand)) + Number(minimum !== undefined || maximum !== undefined) + Number(inStock) + facetKeys.filter((key) => values(searchParams[key]).length).length;
  const listStart = result.meta.total ? (result.meta.page - 1) * result.meta.limit + 1 : 0;
  const listEnd = Math.min(result.meta.page * result.meta.limit, result.meta.total);

  return (
    <main className="min-h-screen bg-slate-50 pb-16" data-theme-key={themeKey}>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <nav aria-label={t("Breadcrumb")} className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-[var(--theme-primary)]">{t("Home")}</Link>
          <span aria-hidden="true">/</span>
          {activeCategory ? (
            <>
              <Link href="/category" className="hover:text-[var(--theme-primary)]">{t("Categories")}</Link>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-slate-700">{t(activeCategory.name)}</span>
            </>
          ) : <span className="font-medium text-slate-700">{t("Categories")}</span>}
        </nav>

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-32">
            <h2 className="text-base font-bold text-slate-900">{t("Filters")}{filterCount ? ` (${filterCount})` : ""}</h2>
            <form action={path} method="get" className="mt-4 space-y-5">
              {first(searchParams.tenant) ? <input type="hidden" name="tenant" value={first(searchParams.tenant)} /> : null}
              {first(searchParams.tenantId) ? <input type="hidden" name="tenantId" value={first(searchParams.tenantId)} /> : null}
              <input type="hidden" name="sort" value={sort} />
              <div>
                <label htmlFor="category-search" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">{t("Search products")}</label>
                <input id="category-search" type="search" name="q" defaultValue={query} placeholder={t("Search products")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--theme-primary)]" />
              </div>
              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{t("Categories")}</h3>
                <div className="max-h-48 space-y-1 overflow-y-auto pr-1 text-sm">
                  <Link href="/category" className={`block rounded-md px-2 py-1.5 ${!activeCategory ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}>{t("All categories")}</Link>
                  {categories.map((category) => (
                    <Link key={category.id} href={`/category/${encodeURIComponent(category.slug)}`} className={`block rounded-md px-2 py-1.5 ${activeCategory?.id === category.id ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}>
                      {t(category.name)}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{t("Price range")}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-500">{t("Min")}
                    <input type="number" name="min_price" min="0" step="1" defaultValue={minimum} placeholder="₹" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-[var(--theme-primary)]" />
                  </label>
                  <label className="text-xs text-slate-500">{t("Max")}
                    <input type="number" name="max_price" min="0" step="1" defaultValue={maximum} placeholder="₹" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-[var(--theme-primary)]" />
                  </label>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <label htmlFor="category-brand" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">{t("Brand")}</label>
                <input id="category-brand" name="brand" list="category-brand-options" defaultValue={brand} placeholder={t("Any brand")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--theme-primary)]" />
                <datalist id="category-brand-options">{brandSuggestions.map((item) => <option key={item} value={item} />)}</datalist>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="in_stock" value="true" defaultChecked={inStock} className="accent-[var(--theme-primary)]" />
                  {t("In stock only")}
                </label>
              </div>
              {facets.slice(0, 6).map(([key, options]) => (
                <fieldset key={key} className="border-t border-slate-100 pt-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t(key.replace(/[-_]/g, " "))}</legend>
                  <div className="mt-2 max-h-36 space-y-2 overflow-y-auto pr-1">
                    {options.slice(0, 12).map((option) => (
                      <label key={option.slug} className="flex items-center justify-between gap-2 text-sm text-slate-700">
                        <span className="flex min-w-0 items-center gap-2">
                          <input type="checkbox" name={key} value={option.slug} defaultChecked={values(searchParams[key]).includes(option.slug)} className="accent-[var(--theme-primary)]" />
                          <span className="truncate">{t(option.value)}</span>
                        </span>
                        <span className="text-xs text-slate-400">{option.count}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <button type="submit" className="w-full rounded-lg bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">{t("Apply filters")}</button>
              {filterCount || query ? <Link href={path} className="block text-center text-xs font-medium text-slate-500 hover:underline">{t("Clear filters")}</Link> : null}
            </form>
          </aside>

          <section aria-label={t("Products")} className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div>
                <h1 className="font-bold text-slate-900">{activeCategory ? t(activeCategory.name) : t("All products")}</h1>
                <p className="text-xs text-slate-500">
                  {result.meta.total ? `${listStart}–${listEnd} ${t("of")} ${result.meta.total} ${t("products")}` : t("No products found")}
                </p>
              </div>
              <CatalogSortControl
                action={path}
                value={sort}
                preservedParams={Array.from(currentParams.entries()).filter(([key]) => key !== "sort" && key !== "page")}
                label={t("Sort by")}
                options={[
                  { value: "newest", label: t("Newest") },
                  { value: "best_selling", label: t("Best selling") },
                  { value: "price_asc", label: t("Price: low to high") },
                  { value: "price_desc", label: t("Price: high to low") },
                ]}
              />
            </div>

            {result.products.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {result.products.map((product) => (
                  <ProductCard key={product.slug} {...product} name={t(product.name)} languageCode={languageCode} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
                <p className="text-lg font-semibold text-slate-900">{t("No products found")}</p>
                <p className="mt-1 text-sm text-slate-500">{t("Try another category or clear the filters.")}</p>
                <Link href={path} className="mt-4 inline-block rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-white">{t("Clear filters")}</Link>
              </div>
            )}

            {result.meta.total_pages > 1 ? (
              <nav aria-label={t("Pagination")} className="mt-8 flex items-center justify-center gap-2">
                {page > 1 ? <Link href={pageHref(page - 1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">← {t("Previous")}</Link> : null}
                <span className="px-3 text-sm text-slate-600">{t("Page")} {result.meta.page} {t("of")} {result.meta.total_pages}</span>
                {page < result.meta.total_pages ? <Link href={pageHref(page + 1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t("Next")} →</Link> : null}
              </nav>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
