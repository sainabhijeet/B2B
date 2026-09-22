import type { Metadata } from "next";
import CategoryBrowse from "@/components/catalog/CategoryBrowse";
import { loadThemeCssText } from "@/engine/template-loader";
import { loadThemeTokenVarsCss, tokenOverridesToCss } from "@/engine/token-loader";
import { resolveStorefrontTheme } from "@/engine/theme-loader";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { headers } from "next/headers";
import { getCategoryBySlug } from "@/services/categoryService";

type PageParams = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "Category" };
  return { title: cat.name };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function CategorySlugPage({ params, searchParams }: { params: PageParams; searchParams: Search }) {
  const { slug } = await params;
  const sp = await searchParams;

  const requestHeaders = await headers();
  const previewLanguage = requestHeaders.get("x-preview-language");
  const resolved = await resolveStorefrontTheme(null, { previewMode: Boolean(previewLanguage), previewLanguageCode: previewLanguage });
  const themeCss = await loadThemeCssText(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tokenVarsCss = await loadThemeTokenVarsCss(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tenantTokenCss = tokenOverridesToCss(resolved.tokenOverrides);

  return (
    <>
      {themeCss ? <style data-theme-runtime-css dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      {tokenVarsCss ? <style data-theme-token-vars dangerouslySetInnerHTML={{ __html: tokenVarsCss }} /> : null}
      {tenantTokenCss ? <style data-tenant-token-vars dangerouslySetInnerHTML={{ __html: tenantTokenCss }} /> : null}
      <StorefrontLocaleFrame languageCode={resolved.selectedLanguageCode} className={`theme-${String(resolved.storefrontKey)}`}>
        <CategoryBrowse
          languageCode={resolved.selectedLanguageCode}
          themeKey={resolved.storefrontKey}
          selectedSlug={slug}
          searchParams={sp}
        />
      </StorefrontLocaleFrame>
    </>
  );
}
