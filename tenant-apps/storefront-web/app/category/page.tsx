import type { Metadata } from "next";
import CategoryBrowse from "@/components/catalog/CategoryBrowse";
import { resolveStorefrontTheme } from "@/engine/theme-loader";
import { loadThemeCssText } from "@/engine/template-loader";
import { loadThemeTokenVarsCss, tokenOverridesToCss } from "@/engine/token-loader";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { headers } from "next/headers";
import { isDemoCatalog } from "@/lib/resolve-storefront-theme";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse categories",
};

// Theme packages are replaceable at runtime; never reuse a rendered category
// payload that may contain CSS from an earlier theme revision.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Search = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

export default async function CategoriesIndexPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const rawTenant = sp.tenant;
  const rawTenantId = sp.tenantId;
  const tenantSlug = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant;
  const tenantId = Array.isArray(rawTenantId) ? rawTenantId[0] : rawTenantId;
  const requestHeaders = await headers();
  const previewMode = first(sp.previewMode) === "1";
  const previewLanguage = first(sp.previewLanguage) || requestHeaders.get("x-preview-language");
  const resolved = await resolveStorefrontTheme(null, { tenantId, tenantSlug, previewMode, previewLanguageCode: previewLanguage });
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
          searchParams={sp}
          previewCatalog={previewMode || isDemoCatalog(resolved) ? resolved.previewCatalog : null}
          layoutMode={typeof designSystem?.productListing === "string" ? designSystem.productListing : undefined}
        />
      </StorefrontLocaleFrame>
    </>
  );
}
