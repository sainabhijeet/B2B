import type { Metadata } from "next";
import CategoryBrowse from "@/components/catalog/CategoryBrowse";
import { resolveStorefrontTheme } from "@/engine/theme-loader";
import { loadThemeCssText } from "@/engine/template-loader";
import { loadThemeTokenVarsCss, tokenOverridesToCss } from "@/engine/token-loader";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse categories",
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function CategoriesIndexPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const rawTenant = sp.tenant;
  const rawTenantId = sp.tenantId;
  const tenantSlug = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant;
  const tenantId = Array.isArray(rawTenantId) ? rawTenantId[0] : rawTenantId;
  const requestHeaders = await headers();
  const previewLanguage = requestHeaders.get("x-preview-language");
  const resolved = await resolveStorefrontTheme(null, { tenantId, tenantSlug, previewMode: Boolean(previewLanguage), previewLanguageCode: previewLanguage });
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
          searchParams={sp}
        />
      </StorefrontLocaleFrame>
    </>
  );
}
