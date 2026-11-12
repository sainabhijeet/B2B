import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { backendOriginFromApiUrl } from "@/lib/api-origin";
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";
import { formatCurrency } from "@/lib/language-consistency";
import { translate } from "@/lib/translation-engine";
import { loadThemeCssText } from "@/engine/template-loader";
import { loadThemeTokenVarsCss, tokenOverridesToCss } from "@/engine/token-loader";
import { resolveStorefrontTheme } from "@/engine/theme-loader";
import AddToCartPanel from "@/components/cart/AddToCartPanel";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/catalog/ProductGallery";
import ShareProductButton from "@/components/catalog/ShareProductButton";
import WishlistButton from "@/components/wishlist/WishlistButton";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { listCategories } from "@/services/categoryService";
import { fetchStorefrontProductDetail, listStorefrontProducts } from "@/services/productService";
import { themePreviewCategories, themePreviewProductDetail, themePreviewProducts } from "@/lib/theme-preview-catalog";
import { isDemoCatalog } from "@/lib/resolve-storefront-theme";

type PageParams = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

function absAssetUrl(value: string): string {
  const url = value.trim();
  if (!url || /^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return `${backendOriginFromApiUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
}

function displayAttribute(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await fetchStorefrontProductDetail(slug);
  if (!detail) return { title: "Product" };
  return {
    title: detail.product.name,
    description: detail.product.description || undefined,
  };
}

export default async function ProductDetailPage({ params, searchParams }: { params: PageParams; searchParams: Search }) {
  const { slug } = await params;
  const sp = await searchParams;
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  const previewMode = first(sp.previewMode) === "1";
  const previewLanguage = first(sp.previewLanguage) || requestHeaders.get("x-preview-language");
  const accessToken = cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value;
  const resolved = await resolveStorefrontTheme(null, {
    tenantId: first(sp.tenantId) || null,
    tenantSlug: first(sp.tenant) || null,
    previewMode,
    previewLanguageCode: previewLanguage,
  });
  const [liveDetail, liveCategories] = await Promise.all([
    fetchStorefrontProductDetail(slug, accessToken ? { accessToken } : undefined),
    listCategories(),
  ]);
  const previewDetail = previewMode || isDemoCatalog(resolved)
    ? themePreviewProductDetail(resolved.previewCatalog, slug)
    : null;
  const isDemoProduct = Boolean(previewDetail);
  const detail = previewDetail ?? liveDetail;
  if (!detail) notFound();
  const designSystem = resolved.manifest?.designSystem as Record<string, unknown> | undefined;
  const productDetailLayout = typeof designSystem?.productDetail === "string" ? designSystem.productDetail : "gallery-left";
  const isClinicalDossier = productDetailLayout === "clinical-dossier";
  const productCardStyle = typeof designSystem?.productCards === "string" ? designSystem.productCards : "minimal";
  const previewCategories = themePreviewCategories(resolved.previewCatalog);
  const categories = isDemoProduct && previewCategories.length > 0 ? previewCategories : liveCategories;

  const product = detail.product;
  const requestedCategorySlug = product.categorySlug?.trim().toLowerCase() ?? "";
  const activeCategory = requestedCategorySlug
    ? categories.find((category) => category.slug.trim().toLowerCase() === requestedCategorySlug)
    : undefined;
  const categoryHref = activeCategory
    ? `/category/${encodeURIComponent(activeCategory.slug)}`
    : "/category";

  const relatedPromise = isDemoProduct
    ? Promise.resolve({
        products: themePreviewProducts(resolved.previewCatalog).filter(
          (item) => isClinicalDossier || !requestedCategorySlug || item.categorySlug === requestedCategorySlug,
        ),
      })
    : listStorefrontProducts({
        ...(activeCategory ? { category: activeCategory.slug } : {}),
        limit: 8,
      });
  const [themeCss, tokenVarsCss, relatedResult] = await Promise.all([
    loadThemeCssText(resolved.webTheme?.manifestPath ?? null, resolved.manifest),
    loadThemeTokenVarsCss(resolved.webTheme?.manifestPath ?? null, resolved.manifest),
    relatedPromise,
  ]);
  const tenantTokenCss = tokenOverridesToCss(resolved.tokenOverrides, resolved.branding);
  const language = resolved.selectedLanguageCode;
  const t = (text: string) => translate(text, language);
  const firstVariant = detail.variants[0];
  const numericPrice = firstVariant?.price == null ? null : Number(firstVariant.price);
  const price = numericPrice != null && Number.isFinite(numericPrice) ? numericPrice : null;
  const numericMrp = firstVariant?.mrp == null ? null : Number(firstVariant.mrp);
  const mrp = numericMrp != null && Number.isFinite(numericMrp) && price != null && numericMrp > price ? numericMrp : null;
  const categoryName = activeCategory?.name || product.categoryName?.trim() || product.categorySlug?.replace(/-/g, " ") || "";
  const gallery = detail.images
    .filter((image) => typeof image.url === "string" && image.url.trim())
    .sort((a, b) => Number(b.isThumbnail) - Number(a.isThumbnail))
    .map((image) => ({ id: image.id, url: absAssetUrl(image.url) }));
  const attributes = Object.entries(firstVariant?.attributesJson ?? {})
    .map(([key, value]) => ({ label: key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " "), value: displayAttribute(value) }))
    .filter((item): item is { label: string; value: string } => item.value !== null);
  const specifications = [
    { label: "Brand", value: product.brand },
    { label: "Category", value: categoryName },
    { label: "Product SKU", value: product.sku },
    { label: "HSN code", value: product.hsnCode },
    { label: "Barcode", value: product.barcode },
    { label: "Weight", value: product.weight },
    { label: "Dimensions", value: product.dimensions },
    { label: "GST", value: firstVariant?.gstRate != null ? `${firstVariant.gstRate}%` : null },
    ...attributes,
  ].filter((item): item is { label: string; value: string } => typeof item.value === "string" && item.value.trim().length > 0);
  const related = relatedResult?.products.filter((item) => item.slug !== product.slug).slice(0, 4) ?? [];

  return (
    <>
      {themeCss ? <style data-theme-runtime-css dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      {tokenVarsCss ? <style data-theme-token-vars dangerouslySetInnerHTML={{ __html: tokenVarsCss }} /> : null}
      {tenantTokenCss ? <style data-tenant-token-vars dangerouslySetInnerHTML={{ __html: tenantTokenCss }} /> : null}
      <StorefrontLocaleFrame languageCode={language} className={`theme-${String(resolved.storefrontKey)}`}>
        <main className="storefront-product-page min-h-screen overflow-x-clip bg-[#f4f7f6] pb-20" data-pdp-layout={productDetailLayout}>
          <div className="mx-auto max-w-[1320px] px-5 pt-7 sm:px-8 lg:px-10">
            <nav aria-label={t("Breadcrumb")} className="pdp-breadcrumb flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
              <Link href="/" className="hover:text-[var(--theme-primary)]">{t("Home")}</Link>
              <span aria-hidden="true">/</span>
              <Link href="/category" className="hover:text-[var(--theme-primary)]">{t("Categories")}</Link>
              {activeCategory ? (
                <>
                  <span aria-hidden="true">/</span>
                  <Link href={categoryHref} className="hover:text-[var(--theme-primary)]">{t(categoryName)}</Link>
                </>
              ) : null}
              <span aria-hidden="true">/</span>
              <span className="max-w-56 truncate font-medium text-slate-700 sm:max-w-md">{t(product.name)}</span>
            </nav>

            <section className="pdp-product-shell mt-7">
            {isClinicalDossier ? (
              <header className="clinical-pdp-filebar">
                <div>
                  <span className="clinical-pdp-filebar-kicker">{t("Clinical product dossier")}</span>
                  <strong>{t(categoryName || "Professional medical supply")}</strong>
                </div>
                <div className="clinical-pdp-filebar-reference">
                  <span>{t("Reference")}</span>
                  <strong>{product.sku}</strong>
                </div>
              </header>
            ) : null}
            <div className="pdp-hero-grid grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,.92fr)] lg:gap-14">
              <div className="pdp-product-media relative min-w-0">
                {isClinicalDossier ? (
                  <div className="clinical-pdp-media-heading">
                    <span>{t("Product visual record")}</span>
                    <small>{gallery.length} {gallery.length === 1 ? t("image") : t("images")}</small>
                  </div>
                ) : null}
                <ProductGallery images={gallery} productName={t(product.name)} />
                {isClinicalDossier ? (
                  <div className="clinical-pdp-media-note">
                    <div>
                      <span>{t("Visual reference")}</span>
                      <strong>{t(product.brand || "Catalogue supply")}</strong>
                    </div>
                    <p>{t("Use the technical record and order controls alongside this catalogue image when preparing a purchase.")}</p>
                  </div>
                ) : null}
                <div className="absolute right-3 top-3 z-40 flex items-center gap-2">
                  <ShareProductButton productName={t(product.name)} productImage={gallery[0]?.url} languageCode={language} />
                  <WishlistButton
                    productId={product.id}
                    productName={product.name}
                    productSlug={product.slug}
                    productImage={gallery[0]?.url}
                    productSku={product.sku}
                    productBrand={product.brand}
                    productPrice={price}
                    previewMode={isDemoProduct}
                    languageCode={language}
                    compact
                  />
                </div>
                <section className="pdp-assurance-strip mt-10 grid overflow-hidden border border-slate-200 bg-white sm:grid-cols-3">
                  {[
                    ["01", "Business-ready supply", "Products organised for professional purchasing"],
                    ["02", "Clear order controls", "Pack, quantity and availability in one place"],
                    ["03", "Trade desk support", "Help for product and bulk-order requirements"],
                  ].map(([number, title, description], index) => (
                    <div key={number} className={`pdp-assurance-item grid grid-cols-[42px_1fr] gap-4 p-6 ${index > 0 ? "border-t border-slate-200 sm:border-l sm:border-t-0" : ""}`}>
                      {isClinicalDossier ? <span className="clinical-pdp-assurance-mark" aria-hidden="true" /> : <span className="pdp-assurance-index flex h-10 w-10 items-center justify-center bg-[var(--theme-primary)] font-mono text-[10px] font-black text-white">{number}</span>}
                      <div>
                        <h2 className="text-sm font-black text-slate-900">{t(title)}</h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{t(description)}</p>
                      </div>
                    </div>
                  ))}
                </section>
              </div>

              <section className="pdp-product-summary min-w-0 self-start lg:sticky lg:top-[10.5rem]">
                {isClinicalDossier ? <p className="clinical-pdp-summary-kicker">{t("Procurement profile")}</p> : null}
                {product.brand ? <p className="pdp-brand-pill inline-flex border border-[var(--theme-primary)]/25 bg-[var(--theme-primary)]/5 px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--theme-primary)]">{t(product.brand)}</p> : null}
                <h1 className="mt-4 max-w-[18ch] text-3xl font-black leading-[1.04] tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-5xl">{t(product.name)}</h1>
                <p className="pdp-sku mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">{t("SKU")}: {product.sku}</p>
                {isClinicalDossier ? (
                  <dl className="clinical-pdp-factline">
                    <div><dt>{t("Minimum order")}</dt><dd>{firstVariant?.moq ?? 1} {t("units")}</dd></div>
                    <div><dt>{t("Supply status")}</dt><dd>{firstVariant?.stockQuantity == null ? t("Checked on order") : firstVariant.stockQuantity > 0 ? t("Available") : t("On request")}</dd></div>
                    <div><dt>{t("Buyer channel")}</dt><dd>{t("Trade account")}</dd></div>
                  </dl>
                ) : null}
                <div className="pdp-price-overview mt-7 border-y border-slate-200 bg-white/60 py-5">
                  {price == null ? (
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{t("Sign in to see price")}</p>
                      <p className="mt-1 text-xs text-slate-500">{t("Retailer pricing is available after login.")}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="text-2xl font-black tracking-[-0.025em] text-slate-950">{t("Starting unit price")}: {formatCurrency(price, language)}</span>
                        {mrp != null ? <span className="text-base text-slate-400 line-through">{formatCurrency(mrp, language)}</span> : null}
                      </div>
                      {firstVariant?.quantityTierApplied ? <p className="mt-1 text-xs text-emerald-700">{t("Your quantity-based price is applied.")}</p> : null}
                      <p className="mt-1 text-xs text-slate-500">{t("Select a pack and quantity to see the current price in the order panel. Final tax is confirmed at checkout.")}</p>
                    </>
                  )}
                </div>
                {product.description ? (
                  <div className="pdp-about mt-5">
                    <h2 className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--theme-primary)]">{t("About this product")}</h2>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{t(product.description)}</p>
                  </div>
                ) : null}
                {product.tags?.length ? (
                  <div className="pdp-tags mt-4 flex flex-wrap gap-2">
                    {product.tags.map((tag) => <span key={tag} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">{t(tag)}</span>)}
                  </div>
                ) : null}
                <aside className="pdp-order-wrap">
                {detail.variants.length > 0 ? (
                  <AddToCartPanel
                    key={product.id}
                    productId={product.id}
                    productName={product.name}
                    productSlug={product.slug}
                    signedIn={Boolean(accessToken)}
                    languageCode={language}
                    previewMode={isDemoProduct}
                    productImage={gallery[0]?.url}
                    brand={product.brand}
                    variants={detail.variants.map((variant) => ({
                      id: variant.id,
                      sku: variant.sku,
                      name: displayAttribute(variant.attributesJson?.packSize) || displayAttribute(variant.attributesJson?.pack_size) || undefined,
                      price: variant.price,
                      moq: variant.moq ?? 1,
                      stockQuantity: variant.stockQuantity ?? null,
                      priceSlabs: variant.priceSlabs ?? [],
                    }))}
                  />
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{t("This product has no purchasable variants yet.")}</div>
                )}
              </aside>
              </section>
            </div>
            </section>

            {specifications.length > 0 ? (
              <section className={`pdp-specification-panel mt-12 overflow-hidden border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)] ${specifications.length <= 3 ? "pdp-specification-panel--compact" : ""}`}>
                <div className="border-b border-slate-200 bg-[#071016] px-6 py-6 text-white sm:px-8">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[var(--theme-secondary)]">{t("Technical overview")}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.025em]">{t(specifications.length <= 3 ? "Product reference" : "Product details")}</h2>
                </div>
                <dl className="grid gap-x-10 px-6 py-3 sm:grid-cols-2 sm:px-8">
                  {specifications.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-slate-100 py-4 text-sm">
                      <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">{t(item.label)}</dt>
                      <dd className="break-words font-semibold text-slate-800">{t(item.value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {detail.variants.length > 1 ? (
              <section className="pdp-variant-panel mt-8 border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] sm:p-8">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--theme-primary)]">{t("Order options")}</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-slate-900">{t("Available packs and variants")}</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="py-3 pr-4">{t("Pack / SKU")}</th><th className="py-3 pr-4">{t("Price")}</th><th className="py-3 pr-4">{t("Minimum order")}</th><th className="py-3">{t("Availability")}</th></tr></thead>
                    <tbody>
                      {detail.variants.map((variant) => (
                        <tr key={variant.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 pr-4 font-medium text-slate-800">{variant.sku}</td>
                          <td className="py-3 pr-4 text-slate-700">{variant.price != null ? formatCurrency(Number(variant.price), language) : t("Sign in to see price")}</td>
                          <td className="py-3 pr-4 text-slate-700">{variant.moq ?? 1}</td>
                          <td className="py-3 text-slate-700">{variant.stockQuantity == null ? t("Stock checked when ordering") : variant.stockQuantity > 0 ? `${t("In stock")} (${variant.stockQuantity})` : t("Out of stock")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {related.length > 0 ? (
              <section className="pdp-related-panel mt-14">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[var(--theme-primary)]">{t("Keep exploring")}</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-slate-950">{t(activeCategory ? "More from this category" : "You may also like")}</h2>
                  </div>
                  <Link href={categoryHref} className="border border-slate-300 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-700 transition hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]">{t("View all")}</Link>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {related.map((item) => <ProductCard key={item.slug} {...item} name={t(item.name)} previewMode={isDemoProduct} languageCode={language} variant={isClinicalDossier ? "clinical-register" : productCardStyle} />)}
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </StorefrontLocaleFrame>
    </>
  );
}
