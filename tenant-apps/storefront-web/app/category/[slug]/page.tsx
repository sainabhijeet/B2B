import type { Metadata } from "next";
import CategoryBrowse from "@/components/catalog/CategoryBrowse";
import { loadThemeCssText } from "@/engine/template-loader";
import { loadThemeTokenVarsCss, tokenOverridesToCss } from "@/engine/token-loader";
import { resolveStorefrontTheme } from "@/engine/theme-loader";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { headers } from "next/headers";
import { getCategoryBySlug } from "@/services/categoryService";
import { isDemoCatalog } from "@/lib/resolve-storefront-theme";

type PageParams = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "Category" };
  return { title: cat.name };
}

type Search = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

export default async function CategorySlugPage({ params, searchParams }: { params: PageParams; searchParams: Search }) {
  const { slug } = await params;
  const sp = await searchParams;

  const requestHeaders = await headers();
  const previewMode = first(sp.previewMode) === "1";
  const previewLanguage = first(sp.previewLanguage) || requestHeaders.get("x-preview-language");
  const resolved = await resolveStorefrontTheme(null, {
    tenantId: first(sp.tenantId) || null,
    tenantSlug: first(sp.tenant) || null,
    previewMode,
    previewLanguageCode: previewLanguage,
  });
  const designSystem = resolved.manifest?.designSystem as Record<string, unknown> | undefined;
  const themeCss = await loadThemeCssText(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tokenVarsCss = await loadThemeTokenVarsCss(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tenantTokenCss = tokenOverridesToCss(resolved.tokenOverrides, resolved.branding);

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
          previewCatalog={previewMode || isDemoCatalog(resolved) ? resolved.previewCatalog : null}
          layoutMode={typeof designSystem?.productListing === "string" ? designSystem.productListing : undefined}
        />
      </StorefrontLocaleFrame>
    </>
  );
}
