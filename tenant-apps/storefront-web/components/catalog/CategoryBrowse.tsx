import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import CatalogSortControl from "@/components/catalog/CatalogSortControl";
import type { ThemeKey } from "@/lib/theme-config";
import { translate } from "@/lib/translation-engine";
import { listCategories } from "@/services/categoryService";
import { listStorefrontProducts, type StorefrontListParams } from "@/services/productService";
import type { ThemePreviewCatalog } from "@/lib/resolve-storefront-theme";
import { themePreviewCategories, themePreviewProducts } from "@/lib/theme-preview-catalog";

type SearchValues = Record<string, string | string[] | undefined>;

type Props = {
  languageCode: string;
  themeKey: ThemeKey;
  selectedSlug?: string;
  searchParams: SearchValues;
  previewCatalog?: ThemePreviewCatalog | null;
  layoutMode?: string;
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

export default async function CategoryBrowse({ languageCode, themeKey, selectedSlug, searchParams, previewCatalog, layoutMode }: Props) {
  const t = (text: string) => translate(text, languageCode);
  const demoCategories = themePreviewCategories(previewCatalog);
  const demoProducts = themePreviewProducts(previewCatalog);
  const usePreviewCatalog = demoCategories.length > 0 || demoProducts.length > 0;
  const categories = usePreviewCatalog ? demoCategories : await listCategories();
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
    (key) => !["tenant", "tenantId", "wbPreview", "previewMode", "previewLanguage", "previewState", "previewPrimaryColor", "previewSecondaryColor", "previewFontFamily", "previewBorderRadius", "q", "brand", "min_price", "max_price", "in_stock", "sort", "page"].includes(key) && /^[a-z0-9_-]+$/i.test(key),
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
  const result = usePreviewCatalog
    ? (() => {
        let rows = demoProducts.filter((product) => {
          if (activeCategory && product.categorySlug !== activeCategory.slug) return false;
          if (query && !`${product.name} ${product.description} ${product.brand ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
          if (brand && product.brand?.toLowerCase() !== brand.toLowerCase()) return false;
          if (minimum !== undefined && (product.price == null || product.price < minimum)) return false;
          if (maximum !== undefined && (product.price == null || product.price > maximum)) return false;
          if (inStock && (product.stock ?? 0) <= 0) return false;
          return true;
        });
        rows = [...rows].sort((a, b) => {
          if (sort === "price_asc") return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
          if (sort === "price_desc") return (b.price ?? -1) - (a.price ?? -1);
          return a.name.localeCompare(b.name);
        });
        const limit = 24;
        const total = rows.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safeCurrentPage = Math.min(page, totalPages);
        return {
          products: rows.slice((safeCurrentPage - 1) * limit, safeCurrentPage * limit),
          filters: {},
          meta: { page: safeCurrentPage, limit, total, total_pages: totalPages },
        };
      })()
    : await listStorefrontProducts(productParams);
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
  const isClinicalRegister = layoutMode === "clinical-register";
  const isMaterialIndex = themeKey === "chemicals-specialty-materials-web-theme";

  return (
    <main className={`storefront-category-page min-h-screen bg-slate-50 pb-16 ${isMaterialIndex ? "material-index-page" : ""}`} data-theme-key={themeKey} data-plp-layout={layoutMode ?? "sidebar-grid"} data-category-variant={isMaterialIndex ? "material-index" : undefined}>
      {isMaterialIndex ? <style>{`
        body[data-theme-layout] .material-index-page{padding-bottom:96px!important;background:#edf3ef!important;color:#102c28}
        body[data-theme-layout] .material-index-page>.material-index-shell{max-width:1400px!important;padding-top:22px!important}
        body[data-theme-layout] .material-index-page .category-breadcrumb{min-height:30px!important;color:#657b72!important;font-family:monospace!important;font-size:10px!important;letter-spacing:.12em!important}
        body[data-theme-layout] .material-index-page .category-browse-intro{display:grid!important;grid-template-columns:minmax(0,1.16fr) minmax(330px,.84fr)!important;align-items:stretch!important;min-height:0!important;margin-top:14px!important;padding:0!important;overflow:hidden!important;border:0!important;border-radius:24px!important;background:#0a432f!important;color:#fff!important;box-shadow:0 24px 60px rgba(10,67,47,.14)!important;isolation:isolate!important}
        body[data-theme-layout] .material-index-page .category-browse-intro:before{right:25%!important;bottom:-205px!important;width:390px!important;height:390px!important;border:1px solid rgba(142,207,167,.22)!important;border-radius:50%!important;background:transparent!important;clip-path:none!important;transform:none!important}
        body[data-theme-layout] .material-index-page .category-browse-intro:after{right:12%!important;top:-150px!important;z-index:-1!important;width:300px!important;height:300px!important;border:1px solid rgba(142,207,167,.18)!important;border-radius:50%!important}
        body[data-theme-layout] .material-index-page .category-browse-intro>div:first-child{padding:48px 50px!important}
        body[data-theme-layout] .material-index-page .category-browse-eyebrow{margin-bottom:14px!important;color:#91d0aa!important;font-family:monospace!important;font-size:10px!important;font-weight:900!important;letter-spacing:.2em!important}
        body[data-theme-layout] .material-index-page .category-browse-intro h1{max-width:18ch!important;margin:0!important;color:#fff!important;font-size:clamp(2.35rem,3.4vw,3.65rem)!important;font-weight:900!important;line-height:1!important;letter-spacing:-.05em!important;text-transform:none!important}
        body[data-theme-layout] .material-index-page .category-browse-description{max-width:670px!important;margin-top:18px!important;color:#c0d8cb!important;font-size:15px!important;line-height:1.75!important}
        body[data-theme-layout] .material-index-page .material-index-brief{display:flex;min-height:100%;flex-direction:column;justify-content:center;padding:40px;border-left:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.055);backdrop-filter:blur(3px)}
        body[data-theme-layout] .material-index-page .material-index-brief>span{color:#91d0aa;font-family:monospace;font-size:9px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}
        body[data-theme-layout] .material-index-page .material-index-brief>strong{max-width:14ch;margin-top:13px;color:#fff;font-size:24px;line-height:1.18;letter-spacing:-.035em}
        body[data-theme-layout] .material-index-page .material-index-cues{display:flex;flex-wrap:wrap;gap:8px;margin-top:26px}
        body[data-theme-layout] .material-index-page .material-index-cues span{padding:9px 12px;border:1px solid rgba(167,211,184,.36);border-radius:999px;color:#d4e7dc;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
        body[data-theme-layout] .material-index-page .material-family-register{display:flex;gap:9px;margin-top:16px;padding:6px;overflow-x:auto;border:1px solid #b6cec1;border-radius:16px;background:rgba(255,255,255,.78);scrollbar-width:thin}
        body[data-theme-layout] .material-index-page .material-family-register a{display:flex;min-height:46px;flex:0 0 auto;align-items:center;gap:10px;padding:10px 16px;border:1px solid transparent;border-radius:12px;color:#49645a;text-decoration:none;transition:background .2s,border-color .2s,color .2s}
        body[data-theme-layout] .material-index-page .material-family-register a:hover,body[data-theme-layout] .material-index-page .material-family-register a.is-active{border-color:#9dc1ad;background:#dcebe2;color:#0b4b32}
        body[data-theme-layout] .material-index-page .material-family-register a.is-active{box-shadow:none}
        body[data-theme-layout] .material-index-page .material-family-mark{display:block!important;width:8px;height:8px;border-radius:50%;background:#14843f}
        body[data-theme-layout] .material-index-page .material-family-register strong{font-size:12px;line-height:1.35;white-space:nowrap}
        body[data-theme-layout] .material-index-page>.material-index-shell>.category-catalog-layout{grid-template-columns:280px minmax(0,1fr)!important;gap:22px!important;margin-top:22px!important}
        body[data-theme-layout] .material-index-page .category-filter-panel{position:sticky!important;top:154px!important;padding:22px!important;border:1px solid #b1cabd!important;border-radius:18px!important;background:#f9fbf9!important;color:#102c28!important;box-shadow:0 16px 38px rgba(20,91,61,.07)!important}
        body[data-theme-layout] .material-index-page .category-filter-heading{padding-bottom:16px!important;border-bottom:1px solid #b9d0c4!important}
        body[data-theme-layout] .material-index-page .category-filter-heading h2{color:#102c28!important;font-size:16px!important}
        body[data-theme-layout] .material-index-page .category-filter-toggle{border-color:#8fb49f!important;color:#14843f!important}
        body[data-theme-layout] .material-index-page .category-filter-form>div,body[data-theme-layout] .material-index-page .category-filter-form>fieldset{border-color:#d1e0d8!important}
        body[data-theme-layout] .material-index-page .category-filter-form label,body[data-theme-layout] .material-index-page .category-filter-form h3,body[data-theme-layout] .material-index-page .category-filter-form legend{color:#60766d!important;font-size:10px!important}
        body[data-theme-layout] .material-index-page .category-filter-form input[type="search"],body[data-theme-layout] .material-index-page .category-filter-form input[type="number"],body[data-theme-layout] .material-index-page .category-filter-form input[list]{height:43px!important;border:1px solid #a7c2b4!important;border-radius:0!important;background:#fff!important;color:#102c28!important;font-size:12px!important}
        body[data-theme-layout] .material-index-page .category-filter-links a{border-radius:0!important;color:#5a7168!important;font-size:12px!important}
        body[data-theme-layout] .material-index-page .category-filter-links a:hover{background:#e8f0eb!important;color:#0b4b32!important}
        body[data-theme-layout] .material-index-page .category-filter-links a.is-active{background:#dceae2!important;color:#0b4b32!important;box-shadow:inset 3px 0 0 #14843f!important}
        body[data-theme-layout] .material-index-page .category-filter-form button[type="submit"]{min-height:46px!important;background:#14843f!important;color:#fff!important}
        body[data-theme-layout] .material-index-page .category-results-toolbar{min-height:82px!important;padding:16px 20px!important;border:1px solid #b1cabd!important;border-left:4px solid #14843f!important;border-radius:16px!important;background:#fff!important;box-shadow:0 12px 32px rgba(20,91,61,.06)!important;color:#102c28!important}
        body[data-theme-layout] .material-index-page .category-results-toolbar h1{color:#102c28!important;font-size:21px!important;letter-spacing:-.025em!important}
        body[data-theme-layout] .material-index-page .category-results-toolbar p{color:#668078!important}
        body[data-theme-layout] .material-index-page .material-results-kicker{margin:0 0 5px!important;color:#14843f!important;font-family:monospace!important;font-size:8px!important;font-weight:900!important;letter-spacing:.16em!important;text-transform:uppercase!important}
        body[data-theme-layout] .material-index-page .category-results-toolbar form label{color:#5a7168!important;font-size:10px!important}
        body[data-theme-layout] .material-index-page .category-results-toolbar select{height:42px!important;border-color:#a8c2b5!important;border-radius:10px!important;background:#f1f6f3!important;color:#102c28!important}
        body[data-theme-layout] .material-index-page .category-product-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:16px!important;margin-top:16px!important}
        body[data-theme-layout] .material-index-page .category-product-grid>.product-card{overflow:hidden!important;border:1px solid #a8c3b5!important;border-radius:18px!important;background:#fff!important;box-shadow:0 14px 34px rgba(20,91,61,.07)!important;transition:transform .2s,box-shadow .2s}
        body[data-theme-layout] .material-index-page .category-product-grid>.product-card:hover{transform:translateY(-4px);box-shadow:0 20px 42px rgba(20,91,61,.12)!important}
        body[data-theme-layout] .material-index-page .product-card-media{min-height:260px!important;background:#dfeae4!important}
        body[data-theme-layout] .material-index-page .product-card-media img{object-fit:contain!important;padding:14px!important}
        body[data-theme-layout] .material-index-page .product-card-body{padding:18px!important;background:#fff!important}
        body[data-theme-layout] .material-index-page .product-card-body h3{font-size:16px!important;line-height:1.35!important}
        @media(max-width:1024px){body[data-theme-layout] .material-index-page>.material-index-shell>.category-catalog-layout{grid-template-columns:1fr!important}body[data-theme-layout] .material-index-page .category-filter-panel{position:static!important}body[data-theme-layout] .material-index-page .category-product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
        @media(max-width:720px){body[data-theme-layout] .material-index-page .category-browse-intro{grid-template-columns:1fr!important}body[data-theme-layout] .material-index-page .category-browse-intro>div:first-child{padding:34px 24px!important}body[data-theme-layout] .material-index-page .category-browse-intro h1{font-size:2.25rem!important}body[data-theme-layout] .material-index-page .material-index-brief{padding:26px 24px;border-top:1px solid rgba(255,255,255,.16);border-left:0}body[data-theme-layout] .material-index-page .category-results-toolbar form{width:100%}}
        @media(max-width:520px){body[data-theme-layout] .material-index-page .category-product-grid{grid-template-columns:1fr!important}body[data-theme-layout] .material-index-page .product-card-media{min-height:280px!important}}
      `}</style> : null}
      <div className={`mx-auto max-w-7xl px-4 pt-6 sm:px-6 ${isMaterialIndex ? "material-index-shell" : ""}`}>
        <nav aria-label={t("Breadcrumb")} className="category-breadcrumb flex flex-wrap items-center gap-2 text-xs text-slate-500">
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

        <section className="category-browse-intro" aria-labelledby="category-page-title">
          <div>
            <p className="category-browse-eyebrow">{t(isClinicalRegister ? "Clinical equipment register" : isMaterialIndex ? "Chemical sourcing workspace" : "Trade catalogue system")}</p>
            <h1 id="category-page-title">{activeCategory ? t(activeCategory.name) : t(isMaterialIndex ? "Find the right material." : "All products")}</h1>
            <p className="category-browse-description">
              {activeCategory?.description
                ? t(activeCategory.description)
                : t(isMaterialIndex ? "Search by material family, compare commercial references and build a focused shortlist for the next requirement." : "Browse the complete product range, compare collections and refine the catalogue for your next trade requirement.")}
            </p>
          </div>
          {isMaterialIndex ? (
            <aside className="material-index-brief" aria-label={t("Material comparison cues")}>
              <span>{t("Build a focused shortlist")}</span>
              <strong>{t("Compare the details that shape the order.")}</strong>
              <div className="material-index-cues"><span>{t("Grade")}</span><span>{t("Pack")}</span><span>{t("Application")}</span><span>{t("Availability")}</span></div>
            </aside>
          ) : (
            <div className="category-browse-stat" aria-label={`${result.meta.total} ${t("products")}`}>
              <span>{activeCategory ? t("Selected collection") : t("Complete catalogue")}</span>
              <strong>{isClinicalRegister ? t("Ready") : String(result.meta.total).padStart(2, "0")}</strong>
              <small>{t(isClinicalRegister ? "catalog workspace" : "catalogue items")}</small>
            </div>
          )}
        </section>

        {isMaterialIndex ? (
          <nav className="material-family-register" aria-label={t("Material families")}>
            <Link href="/category" className={!activeCategory ? "is-active" : ""}><span className="material-family-mark" aria-hidden="true" /><strong>{t("All materials")}</strong></Link>
            {categories.map((category) => (
              <Link key={category.id} href={`/category/${encodeURIComponent(category.slug)}`} className={activeCategory?.id === category.id ? "is-active" : ""}>
                <span className="material-family-mark" aria-hidden="true" /><strong>{t(category.name)}</strong>
              </Link>
            ))}
          </nav>
        ) : null}

        {isClinicalRegister ? (
          <nav className="clinical-collection-register" aria-label={t("Clinical collections")}>
            <Link href="/category" className={!activeCategory ? "is-active" : ""}>
              <strong>{t("Complete register")}</strong><small>{t("All equipment")}</small>
            </Link>
            {categories.map((category) => (
              <Link key={category.id} href={`/category/${encodeURIComponent(category.slug)}`} className={activeCategory?.id === category.id ? "is-active" : ""}>
                <strong>{t(category.name)}</strong><small>{t("Open collection")}</small>
              </Link>
            ))}
          </nav>
        ) : null}

        <div className={`category-catalog-layout mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] ${isClinicalRegister ? "clinical-register-layout" : ""}`}>
          <aside className="category-filter-panel h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-32">
            <details className="category-filter-disclosure" open>
              <summary>
                <div className="category-filter-heading">
                  {isClinicalRegister || isMaterialIndex ? null : <span aria-hidden="true">01</span>}
                  <h2 className="text-base font-bold text-slate-900">{t(isClinicalRegister ? "Procurement controls" : isMaterialIndex ? "Material filters" : "Refine catalogue")}{filterCount ? isMaterialIndex ? ` · ${t("Active")}` : ` (${filterCount})` : ""}</h2>
                </div>
                <span className="category-filter-toggle" aria-hidden="true">+</span>
              </summary>
              <form action={path} method="get" className="category-filter-form mt-4 space-y-5">
              {first(searchParams.tenant) ? <input type="hidden" name="tenant" value={first(searchParams.tenant)} /> : null}
              {first(searchParams.tenantId) ? <input type="hidden" name="tenantId" value={first(searchParams.tenantId)} /> : null}
              <input type="hidden" name="sort" value={sort} />
              <div>
                <label htmlFor="category-search" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">{t(isMaterialIndex ? "Search material record" : "Search products")}</label>
                <input id="category-search" type="search" name="q" defaultValue={query} placeholder={t(isMaterialIndex ? "Name, grade or use" : "Search products")} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--theme-primary)]" />
              </div>
              {!isClinicalRegister ? <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{t("Categories")}</h3>
                <div className="category-filter-links max-h-48 space-y-1 overflow-y-auto pr-1 text-sm">
                  <Link href="/category" className={`block rounded-md px-2 py-1.5 ${!activeCategory ? "is-active bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}>{t("All categories")}</Link>
                  {categories.map((category) => (
                    <Link key={category.id} href={`/category/${encodeURIComponent(category.slug)}`} className={`block rounded-md px-2 py-1.5 ${activeCategory?.id === category.id ? "is-active bg-slate-100 font-semibold text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}>
                      {t(category.name)}
                    </Link>
                  ))}
                </div>
              </div> : null}
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
                        {isMaterialIndex ? null : <span className="text-xs text-slate-400">{option.count}</span>}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <button type="submit" className="w-full rounded-lg bg-[var(--theme-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">{t("Apply filters")}</button>
              {filterCount || query ? <Link href={path} className="block text-center text-xs font-medium text-slate-500 hover:underline">{t("Clear filters")}</Link> : null}
              </form>
            </details>
          </aside>

          <section aria-label={t("Products")} className="category-results-panel min-w-0">
            <div className="category-results-toolbar flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div>
                {isClinicalRegister ? <p className="clinical-results-kicker">{t("EQUIPMENT / BUYING REGISTER")}</p> : null}
                {isMaterialIndex ? <p className="material-results-kicker">{t("MATERIAL RECORDS / COMMERCIAL INDEX")}</p> : null}
                <h1 className="font-bold text-slate-900">{activeCategory ? t(activeCategory.name) : t("All products")}</h1>
                <p className="text-xs text-slate-500">
                  {isClinicalRegister
                    ? t(result.meta.total ? "Complete demo selection" : "No products found")
                    : isMaterialIndex
                      ? t(result.meta.total ? "Materials ready to compare" : "No materials found")
                      : result.meta.total ? `${listStart}–${listEnd} ${t("of")} ${result.meta.total} ${t("products")}` : t("No products found")}
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
              <div className="category-product-grid storefront-product-grid mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {result.products.map((product) => (
                  <ProductCard key={product.slug} {...product} name={t(product.name)} previewMode={usePreviewCatalog} languageCode={languageCode} variant={layoutMode === "clinical-register" ? "clinical-register" : layoutMode === "specification-list" ? "bulk-table" : layoutMode === "editorial-three" ? "editorial" : layoutMode === "quick-order" ? "horizontal" : "marketplace"} />
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
