import type { ReactNode } from "react";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import TemplateRenderer from "@/engine/template-renderer";
import { loadPageTemplateChain, resolveStorefrontTheme } from "@/engine/theme-loader";
import {
  loadThemeComponentSchemas,
  loadThemeCssText,
  type TemplatePageType,
} from "@/engine/template-loader";
import { loadThemeTokenVarsCss, tokenOverridesToCss } from "@/engine/token-loader";
import { storefrontDisplayName } from "@/lib/resolve-storefront-theme";

type Props = {
  page: TemplatePageType;
  fallback: ReactNode;
};

const SHELL_SECTION_TYPES = new Set(["header", "header-basic", "footer", "footer-columns"]);

/**
 * Renders an informational storefront page from the tenant's current theme API.
 * The route-owned fallback is used only when the selected theme has no page
 * template/content, so older themes remain functional.
 */
export default async function ThemedContentPage({ page, fallback }: Props) {
  const resolved = await resolveStorefrontTheme();
  const { template, themeKey } = await loadPageTemplateChain(resolved, page);
  const hasPageContent = template.sections.some((section) => {
    const type = String(section.type ?? section.component ?? section.id ?? "").trim().toLowerCase();
    return type && !SHELL_SECTION_TYPES.has(type);
  });

  if (!hasPageContent) return fallback;

  const [themeCss, tokenVarsCss, componentSchemas] = await Promise.all([
    loadThemeCssText(resolved.webTheme?.manifestPath ?? null, resolved.manifest),
    loadThemeTokenVarsCss(resolved.webTheme?.manifestPath ?? null, resolved.manifest),
    loadThemeComponentSchemas(resolved.webTheme?.manifestPath ?? null, resolved.manifest),
  ]);
  const tenantTokenCss = tokenOverridesToCss(resolved.tokenOverrides);
  const branding = resolved.branding;

  return (
    <>
      {themeCss ? <style data-theme-runtime-css dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      {tokenVarsCss ? <style data-theme-token-vars dangerouslySetInnerHTML={{ __html: tokenVarsCss }} /> : null}
      {tenantTokenCss ? <style data-tenant-token-vars dangerouslySetInnerHTML={{ __html: tenantTokenCss }} /> : null}
      <StorefrontLocaleFrame languageCode={resolved.selectedLanguageCode} className={`theme-${String(themeKey)}`}>
        <main className="min-h-[50vh]">
          <TemplateRenderer
            template={template}
            themeKey={themeKey}
            componentSchemas={componentSchemas}
            languageCode={resolved.selectedLanguageCode}
            sharedSectionProps={{
              logoText: storefrontDisplayName(resolved),
              logoImageUrl: branding?.logoUrl || branding?.logoDataUrl || undefined,
              industryName: branding?.industryName || undefined,
            }}
          />
        </main>
      </StorefrontLocaleFrame>
    </>
  );
}
