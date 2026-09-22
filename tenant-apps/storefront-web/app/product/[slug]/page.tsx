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
import WishlistButton from "@/components/wishlist/WishlistButton";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { fetchStorefrontProductDetail, listStorefrontProducts } from "@/services/productService";

type PageParams = Promise<{ slug: string }>;

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

export default async function ProductDetailPage({ params }: { params: PageParams }) {
  const { slug } = await params;
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  const previewLanguage = requestHeaders.get("x-preview-language");
  const accessToken = cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value;
  const [resolved, detail] = await Promise.all([
    resolveStorefrontTheme(null, { previewMode: Boolean(previewLanguage), previewLanguageCode: previewLanguage }),
    fetchStorefrontProductDetail(slug, accessToken ? { accessToken } : undefined),
  ]);
  if (!detail) notFound();

  const [themeCss, tokenVarsCss, relatedResult] = await Promise.all([
    loadThemeCssText(resolved.webTheme?.manifestPath ?? null, resolved.manifest),
    loadThemeTokenVarsCss(resolved.webTheme?.manifestPath ?? null, resolved.manifest),
    detail.product.categorySlug
      ? listStorefrontProducts({ category: detail.product.categorySlug, limit: 8 })
      : Promise.resolve(null),
  ]);
  const tenantTokenCss = tokenOverridesToCss(resolved.tokenOverrides);
  const language = resolved.selectedLanguageCode;
  const t = (text: string) => translate(text, language);
  const product = detail.product;
  const firstVariant = detail.variants[0];
  const numericPrice = firstVariant?.price == null ? null : Number(firstVariant.price);
  const price = numericPrice != null && Number.isFinite(numericPrice) ? numericPrice : null;
  const numericMrp = firstVariant?.mrp == null ? null : Number(firstVariant.mrp);
  const mrp = numericMrp != null && Number.isFinite(numericMrp) && price != null && numericMrp > price ? numericMrp : null;
  const categoryName = product.categoryName?.trim() || product.categorySlug?.replace(/-/g, " ") || "";
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
        <main className="min-h-screen bg-slate-50 pb-16">
          <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
            <nav aria-label={t("Breadcrumb")} className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Link href="/" className="hover:text-[var(--theme-primary)]">{t("Home")}</Link>
              <span aria-hidden="true">/</span>
              <Link href="/category" className="hover:text-[var(--theme-primary)]">{t("Categories")}</Link>
              {product.categorySlug ? (
                <>
                  <span aria-hidden="true">/</span>
                  <Link href={`/category/${encodeURIComponent(product.categorySlug)}`} className="hover:text-[var(--theme-primary)]">{t(categoryName)}</Link>
                </>
              ) : null}
              <span aria-hidden="true">/</span>
              <span className="max-w-56 truncate font-medium text-slate-700 sm:max-w-md">{t(product.name)}</span>
            </nav>

            <div className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_300px]">
              <ProductGallery images={gallery} productName={t(product.name)} />

              <section className="min-w-0">
                {product.brand ? <p className="text-sm font-semibold text-[var(--theme-primary)]">{t(product.brand)}</p> : null}
                <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                  <h1 className="min-w-0 flex-1 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{t(product.name)}</h1>
                  <WishlistButton productId={product.id} languageCode={language} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{t("SKU")}: {product.sku}</p>
                <div className="mt-5 border-y border-slate-200 py-4">
                  {price == null ? (
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{t("Sign in to see price")}</p>
                      <p className="mt-1 text-xs text-slate-500">{t("Retailer pricing is available after login.")}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="text-xl font-bold text-slate-950">{t("Starting unit price")}: {formatCurrency(price, language)}</span>
                        {mrp != null ? <span className="text-base text-slate-400 line-through">{formatCurrency(mrp, language)}</span> : null}
                      </div>
                      {firstVariant?.quantityTierApplied ? <p className="mt-1 text-xs text-emerald-700">{t("Your quantity-based price is applied.")}</p> : null}
                      <p className="mt-1 text-xs text-slate-500">{t("Select a pack and quantity to see the current price in the order panel. Final tax is confirmed at checkout.")}</p>
                    </>
                  )}
                </div>
                {product.description ? (
                  <div className="mt-5">
                    <h2 className="text-base font-bold text-slate-900">{t("About this product")}</h2>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">{t(product.description)}</p>
                  </div>
                ) : null}
                {product.tags?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.tags.map((tag) => <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-200">{t(tag)}</span>)}
                  </div>
                ) : null}
              </section>

              <aside>
                {detail.variants.length > 0 ? (
                  <AddToCartPanel
                    productId={product.id}
                    productName={product.name}
                    productSlug={product.slug}
                    signedIn={Boolean(accessToken)}
                    languageCode={language}
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
            </div>

            {specifications.length > 0 ? (
              <section className="mt-9 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">{t("Product details")}</h2>
                <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
                  {specifications.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-slate-100 py-3 text-sm">
                      <dt className="font-medium text-slate-500">{t(item.label)}</dt>
                      <dd className="break-words text-slate-800">{t(item.value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {detail.variants.length > 1 ? (
              <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">{t("Available packs and variants")}</h2>
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
              <section className="mt-10">
                <div className="flex items-end justify-between gap-3">
                  <h2 className="text-xl font-bold text-slate-950">{t("More from this category")}</h2>
                  {product.categorySlug ? <Link href={`/category/${encodeURIComponent(product.categorySlug)}`} className="text-sm font-semibold text-[var(--theme-primary)] hover:underline">{t("View all")}</Link> : null}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {related.map((item) => <ProductCard key={item.slug} {...item} name={t(item.name)} languageCode={language} />)}
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </StorefrontLocaleFrame>
    </>
  );
}
