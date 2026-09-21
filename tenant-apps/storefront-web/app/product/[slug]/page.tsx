import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { backendOriginFromApiUrl } from "@/lib/api-origin";
import { loadThemeCssText } from "@/engine/template-loader";
import { loadThemeTokenVarsCss, tokenOverridesToCss } from "@/engine/token-loader";
import { resolveStorefrontTheme } from "@/engine/theme-loader";
import AddToCartPanel from "@/components/cart/AddToCartPanel";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { headers } from "next/headers";
import { translate } from "@/lib/translation-engine";
import { fetchStorefrontProductDetail } from "@/services/productService";

type PageParams = Promise<{ slug: string }>;

function absAssetUrl(u: string): string {
  const t = u.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  const o = backendOriginFromApiUrl();
  return `${o}${t.startsWith("/") ? "" : "/"}${t}`;
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await fetchStorefrontProductDetail(slug);
  if (!detail) return { title: "Product" };
  return { title: detail.product.name };
}

export default async function ProductDetailPage({ params }: { params: PageParams }) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const previewLanguage = requestHeaders.get("x-preview-language");
  const resolved = await resolveStorefrontTheme(null, { previewMode: Boolean(previewLanguage), previewLanguageCode: previewLanguage });
  const detail = await fetchStorefrontProductDetail(slug);
  if (!detail) notFound();

  const themeCss = await loadThemeCssText(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tokenVarsCss = await loadThemeTokenVarsCss(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tenantTokenCss = tokenOverridesToCss(resolved.tokenOverrides);
  const v0 = detail.variants[0];
  const price = Number.parseFloat((v0?.price ?? "0").toString());
  const currency = "INR";
  const gallery = detail.images.map((im) => absAssetUrl(im.url));
  const t = (text: string) => translate(text, resolved.selectedLanguageCode);

  return (
    <>
      {themeCss ? <style data-theme-runtime-css dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      {tokenVarsCss ? <style data-theme-token-vars dangerouslySetInnerHTML={{ __html: tokenVarsCss }} /> : null}
      {tenantTokenCss ? <style data-tenant-token-vars dangerouslySetInnerHTML={{ __html: tenantTokenCss }} /> : null}
      <StorefrontLocaleFrame languageCode={resolved.selectedLanguageCode} className={`theme-${String(resolved.storefrontKey)}`}>
        <nav className="mx-auto max-w-6xl px-4 py-3 text-sm text-slate-600">
          <Link href="/product" className="font-medium text-indigo-600 hover:underline">
            {t("Catalog")}
          </Link>
          {detail.product.categorySlug ? (
            <>
              {" · "}
              <Link href={`/category/${detail.product.categorySlug}`} className="hover:underline">
                {t(detail.product.categorySlug)}
              </Link>
            </>
          ) : null}
        </nav>
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-3">
              {gallery.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {gallery.slice(0, 6).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={src} alt="" className="aspect-square w-full rounded-xl border border-slate-200 object-cover" />
                  ))}
                </div>
              ) : (
                <div className="aspect-square w-full max-w-md rounded-xl bg-slate-100" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{t(detail.product.name)}</h1>
              <p className="mt-3 text-xl text-slate-800">
                {currency}{" "}
                {Number.isFinite(price) ? price.toLocaleString("en-IN") : "—"}
              </p>
              {detail.product.description ? (
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{t(detail.product.description)}</p>
              ) : null}
              {detail.variants.length > 1 ? (
                <p className="mt-4 text-xs text-slate-500">
                  {detail.variants.length} {t("variants")} - {t("choose below.")}
                </p>
              ) : null}
              {detail.variants.length > 0 ? (
                <AddToCartPanel
                  productId={detail.product.id}
                  productName={detail.product.name}
                  languageCode={resolved.selectedLanguageCode}
                  variants={detail.variants.map((v) => ({
                    id: v.id,
                    sku: v.sku,
                    price: v.price,
                  }))}
                />
              ) : (
                <p className="mt-4 text-xs text-amber-800">{t("This product has no purchasable variants yet.")}</p>
              )}
            </div>
          </div>
        </section>
      </StorefrontLocaleFrame>
    </>
  );
}
