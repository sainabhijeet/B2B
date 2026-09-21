import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadThemeCssText } from "@/engine/template-loader";
import { loadThemeTokenVarsCss, tokenOverridesToCss } from "@/engine/token-loader";
import { resolveStorefrontTheme } from "@/engine/theme-loader";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { headers } from "next/headers";
import { translate } from "@/lib/translation-engine";
import ProductGrid from "@/sections/ProductGrid";
import { getCategoryBySlug } from "@/services/categoryService";

type PageParams = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "Category" };
  return { title: cat.name };
}

export default async function CategorySlugPage({ params }: { params: PageParams }) {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();

  const requestHeaders = await headers();
  const previewLanguage = requestHeaders.get("x-preview-language");
  const resolved = await resolveStorefrontTheme(null, { previewMode: Boolean(previewLanguage), previewLanguageCode: previewLanguage });
  const themeCss = await loadThemeCssText(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tokenVarsCss = await loadThemeTokenVarsCss(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tenantTokenCss = tokenOverridesToCss(resolved.tokenOverrides);
  const t = (text: string) => translate(text, resolved.selectedLanguageCode);

  return (
    <>
      {themeCss ? <style data-theme-runtime-css dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      {tokenVarsCss ? <style data-theme-token-vars dangerouslySetInnerHTML={{ __html: tokenVarsCss }} /> : null}
      {tenantTokenCss ? <style data-tenant-token-vars dangerouslySetInnerHTML={{ __html: tenantTokenCss }} /> : null}
      <StorefrontLocaleFrame languageCode={resolved.selectedLanguageCode} className={`theme-${String(resolved.storefrontKey)}`}>
        <nav className="mx-auto max-w-6xl px-4 py-3 text-sm">
          <Link href="/category" className="font-medium text-indigo-600 hover:underline">
            {t("All categories")}
          </Link>
        </nav>
        <header className="mx-auto max-w-6xl px-4 pb-4">
          <h1 className="text-2xl font-semibold text-slate-900">{t(cat.name)}</h1>
          {cat.description ? <p className="mt-1 text-sm text-slate-600">{t(cat.description)}</p> : null}
        </header>
        <ProductGrid
          themeKey={resolved.storefrontKey}
          categorySlug={slug}
          title="Products in this category"
          subtitle="Loaded from your tenant database via the storefront API."
          languageCode={resolved.selectedLanguageCode}
        />
      </StorefrontLocaleFrame>
    </>
  );
}
