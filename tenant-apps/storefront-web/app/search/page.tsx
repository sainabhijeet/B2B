import Link from "next/link";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import ProductCard from "@/components/ProductCard";
import { resolveStorefrontTheme } from "@/engine/theme-loader";
import { isDemoCatalog } from "@/lib/resolve-storefront-theme";
import { themePreviewProducts, type ThemePreviewProduct } from "@/lib/theme-preview-catalog";
import { translate } from "@/lib/translation-engine";
import { listStorefrontProducts } from "@/services/productService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchValues = Record<string, string | string[] | undefined>;
type SearchParams = Promise<SearchValues>;

const POLYMER_ALIASES: Record<string, string[]> = {
  polypropylene: ["pp", "pp resin"],
  polyethylene: ["pe"],
  "polyethylene terephthalate": ["pet", "recycled pet"],
  polystyrene: ["ps"],
  "polyvinyl chloride": ["pvc", "pvc compound"],
  nylon: ["nylon", "polyamide"],
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
}

function previewProductMatches(product: ThemePreviewProduct, query: string): boolean {
  const normalizedQuery = normalized(query);
  if (!normalizedQuery) return true;
  const aliases = POLYMER_ALIASES[normalizedQuery] ?? [];
  const terms = [normalizedQuery, ...aliases.map(normalized)];
  const haystack = normalized([
    product.name,
    product.description,
    product.brand ?? "",
    product.categoryName ?? "",
    product.categorySlug,
    product.sku,
    ...(product.features ?? []),
    ...Object.entries(product.attributes ?? {}).flatMap(([key, value]) => [key, String(value ?? "")]),
  ].join(" "));
  const words = new Set(haystack.split(/\s+/u));
  return terms.some((term) => term.length <= 3 ? words.has(term) : haystack.includes(term));
}

function SearchMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path strokeLinecap="round" d="m16 16 4.25 4.25" />
    </svg>
  );
}

function PolymerNetworkMark() {
  return (
    <svg className="polymer-network-mark" viewBox="0 0 420 260" fill="none" aria-hidden="true">
      <path d="M43 172 112 93l83 32 79-72 99 70-43 93-105-8-68 38-114-74Z" />
      <path d="m112 93 45 153m38-121 30 83m49-155 56 163M43 172l182 36m-68 38 117-193" />
      <circle cx="43" cy="172" r="15" />
      <circle cx="112" cy="93" r="20" />
      <circle cx="195" cy="125" r="13" />
      <circle cx="274" cy="53" r="17" />
      <circle cx="373" cy="123" r="22" />
      <circle cx="330" cy="216" r="14" />
      <circle cx="225" cy="208" r="24" />
      <circle cx="157" cy="246" r="11" />
    </svg>
  );
}

function polymerSearchHref(searchParams: SearchValues, query: string): string {
  const params = new URLSearchParams({ q: query });
  for (const key of ["tenant", "tenantId", "wbPreview", "previewMode", "previewLanguage"]) {
    const value = first(searchParams[key]);
    if (value) params.set(key, value);
  }
  return `/search?${params.toString()}`;
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const query = first(sp.q);
  const previewMode = first(sp.previewMode) === "1";
  const resolved = await resolveStorefrontTheme(null, {
    tenantId: first(sp.tenantId) || null,
    tenantSlug: first(sp.tenant) || null,
    previewMode,
    previewLanguageCode: first(sp.previewLanguage) || null,
  });
  const language = resolved.selectedLanguageCode;
  const t = (text: string) => translate(text, language);
  const designSystem = resolved.manifest?.designSystem as Record<string, unknown> | undefined;
  const isPolymerSearch = designSystem?.id === "ds-17-web" || resolved.storefrontKey === "plastics-polymers-web-theme";
  const previewProducts = themePreviewProducts(resolved.previewCatalog);
  const usePreviewCatalog = previewProducts.length > 0 && (previewMode || isDemoCatalog(resolved));
  const result = query
    ? usePreviewCatalog
      ? { products: previewProducts.filter((product) => previewProductMatches(product, query)) }
      : await listStorefrontProducts({ q: query, limit: 60 })
    : null;
  const resultCount = result?.products.length ?? 0;

  if (isPolymerSearch) {
    const quickQueries = ["PP resin", "Black masterbatch", "ABS", "Recycled PET", "PVC compound", "Nylon"];
    return (
      <StorefrontLocaleFrame languageCode={language} className={`theme-${String(resolved.storefrontKey)}`}>
        <main className="storefront-search-page polymer-material-search" data-search-state={query ? resultCount ? "matched" : "unmatched" : "idle"}>
          <section className="polymer-search-intro" aria-labelledby="polymer-search-title">
            <div className="polymer-search-intro-copy">
              <p className="polymer-search-kicker"><span>{t("Material discovery desk")}</span><i aria-hidden="true" />{t("Query scan active")}</p>
              <h1 id="polymer-search-title">
                <span>{query ? t("Material match register") : t("Find a polymer by practical use")}</span>
                <strong>{query ? `“${query}”` : t("Resin. Grade. Application.")}</strong>
              </h1>
              <p className="polymer-search-summary">
                {query
                  ? resultCount
                    ? `${resultCount} ${t(resultCount === 1 ? "material record matched" : "material records matched")} ${t("across the active trade catalogue.")}`
                    : t("No direct record matched this wording. Use a material family below or send the requirement to the sourcing desk.")
                  : t("Search the catalogue using a polymer family, commercial form, application or product code.")}
              </p>
              <div className="polymer-search-readout" aria-label={t("Search readout") }>
                <span><small>{t("Query")}</small><strong>{query || t("Awaiting input")}</strong></span>
                <span><small>{t("Matches")}</small><strong>{String(resultCount).padStart(2, "0")}</strong></span>
                <span><small>{t("Index")}</small><strong>{t("Polymer / 17")}</strong></span>
              </div>
            </div>
            <aside className="polymer-search-scan" aria-label={t("Polymer query visualisation") }>
              <div className="polymer-scan-grid" aria-hidden="true" />
              <PolymerNetworkMark />
              <div className="polymer-scan-caption">
                <span>{t("Chain signature")}</span>
                <strong>{resultCount ? t("Catalogue signal found") : t("Expanding material terms")}</strong>
                <small>{t("Family · form · use · volume")}</small>
              </div>
            </aside>
          </section>

          <nav className="polymer-search-rail" aria-label={t("Suggested material searches") }>
            <span>{t("Search by material signal")}</span>
            {quickQueries.map((item) => <Link key={item} href={polymerSearchHref(sp, item)}>{t(item)}</Link>)}
          </nav>

          <section className="polymer-search-results" aria-label={t("Search results") }>
            {resultCount > 0 ? (
              <>
                <div className="polymer-search-product-grid storefront-product-grid">
                  {result?.products.map((product) => (
                    <ProductCard key={product.slug} {...product} name={t(product.name)} previewMode={usePreviewCatalog} languageCode={language} variant="marketplace" />
                  ))}
                </div>
                <aside className="polymer-result-note">
                  <span>{t("Need a different grade?")}</span>
                  <p>{t("Share the application, processing method and target volume. The material desk can build a focused sourcing brief.")}</p>
                  <Link href="/bulk-orders">{t("Build sourcing brief")} <b aria-hidden="true">→</b></Link>
                </aside>
              </>
            ) : query ? (
              <div className="polymer-no-match">
                <aside className="polymer-no-match-status">
                  <span>{t("QUERY / 00")}</span>
                  <div><SearchMark /></div>
                  <strong>{t("No direct material record")}</strong>
                  <small>{t("Catalogue scan complete")}</small>
                </aside>
                <div className="polymer-no-match-copy">
                  <p>{t("Translate the requirement")}</p>
                  <h2>{t("Search by what the polymer needs to do.")}</h2>
                  <p>{t("Try a resin family, colour concentrate, recycled feedstock or engineering application. For an exact grade, send the specification to the trade desk.")}</p>
                  <div className="polymer-path-grid">
                    <Link href={polymerSearchHref(sp, "PP resin")}><span>{t("01 / RESIN")}</span><strong>{t("PP & PE families")}</strong><small>{t("Granules and compounds")}</small></Link>
                    <Link href={polymerSearchHref(sp, "Masterbatch")}><span>{t("02 / FUNCTION")}</span><strong>{t("Masterbatches")}</strong><small>{t("Colour and additives")}</small></Link>
                    <Link href={polymerSearchHref(sp, "Recycled PET")}><span>{t("03 / RECYCLED")}</span><strong>{t("Recovered feedstock")}</strong><small>{t("Flakes and reprocessed material")}</small></Link>
                  </div>
                  <div className="polymer-no-match-actions">
                    <Link href="/category">{t("Browse material index")}</Link>
                    <Link href="/contact">{t("Send a specification")} <b aria-hidden="true">→</b></Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="polymer-search-idle">
                <span><SearchMark /></span>
                <div><p>{t("Material query is ready")}</p><h2>{t("Start with a polymer, grade or application.")}</h2></div>
                <Link href="/category">{t("Browse material index")} <b aria-hidden="true">→</b></Link>
              </div>
            )}
          </section>
        </main>
      </StorefrontLocaleFrame>
    );
  }

  return (
    <StorefrontLocaleFrame languageCode={language} className="theme-storefront">
      <main className="storefront-search-page min-h-[58vh] bg-[#f4f7f6] text-slate-950">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1260px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-[var(--theme-primary)]">{t("Product discovery")}</p>
                <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">
                  {query ? <>{t("Results for")} <span className="text-[var(--theme-primary)]">&ldquo;{query}&rdquo;</span></> : t("Search products")}
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-500">{query ? `${resultCount} ${t(resultCount === 1 ? "product found" : "products found")}` : t("Use the search bar in the header to find products, brands and categories.")}</p>
              </div>
              <Link href="/category" className="inline-flex min-h-11 items-center justify-center border border-slate-300 bg-white px-5 text-[11px] font-black uppercase tracking-[0.1em] text-slate-800 transition hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]">{t("Browse all products")}</Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1260px] px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          {resultCount > 0 ? (
            <section aria-label={t("Search results")}>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {result?.products.map((product) => <ProductCard key={product.slug} {...product} name={t(product.name)} previewMode={usePreviewCatalog} languageCode={language} />)}
              </div>
            </section>
          ) : query ? (
            <section className="overflow-hidden border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
              <div className="grid lg:grid-cols-[220px_1fr]">
                <div className="flex min-h-44 items-center justify-center bg-[#071016] text-[var(--theme-secondary)] lg:min-h-64"><span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/[0.06]"><SearchMark /></span></div>
                <div className="p-7 sm:p-10 lg:p-12">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[var(--theme-primary)]">{t("No match found")}</p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.025em] sm:text-3xl">{t("We could not find a product matching your search.")}</h2>
                  <p className="mt-4 max-w-2xl leading-7 text-slate-600">{t("Check the spelling, try a broader product name, or explore the complete catalogue. You can enter a new search directly in the header above.")}</p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link href="/category" className="inline-flex min-h-12 items-center justify-center bg-[var(--theme-primary)] px-6 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:brightness-110">{t("Explore catalogue")}</Link>
                    <Link href="/contact" className="inline-flex min-h-12 items-center justify-center border border-slate-300 px-6 text-xs font-black uppercase tracking-[0.1em] text-slate-800 transition hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]">{t("Ask our team")}</Link>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="border border-dashed border-slate-300 bg-white p-10 text-center sm:p-16">
              <h2 className="text-2xl font-black">{t("What are you looking for?")}</h2>
              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">{t("Enter a product, brand or category in the header search to begin.")}</p>
            </section>
          )}
        </div>
      </main>
    </StorefrontLocaleFrame>
  );
}
