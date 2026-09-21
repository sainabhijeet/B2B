import {
  loadTemplateForPage,
  type TemplatePageType,
} from "@/engine/template-loader";
import { mergeStorefrontBrandingIntoTemplate } from "@/engine/merge-storefront-branding";
import { loadLocale } from "@/lib/localization-service";
import { localizeTemplate } from "@/lib/translation-engine";
import { applyTenantContentOverrides } from "@/engine/tenant-overrides";
import type { ResolvedStorefrontTheme } from "@/lib/resolve-storefront-theme";
import { resolveStorefrontTheme, resolveStorefrontThemeKey } from "@/lib/resolve-storefront-theme";
import type { TemplateFile } from "@/engine/schema/theme-engine.schema";

export { resolveStorefrontTheme, resolveStorefrontThemeKey };

/**
 * Home: API manifest → public/themes/{key} → built-in JSON fallback.
 * Themes are JSON + assets only; section UI comes from the storefront registry.
 */
export async function loadHomeTemplateChain(
  resolved: ResolvedStorefrontTheme,
): Promise<{ template: TemplateFile; themeKey: ResolvedStorefrontTheme["storefrontKey"] }> {
  return loadPageTemplateChain(resolved, "home");
}

export async function loadPageTemplateChain(
  resolved: ResolvedStorefrontTheme,
  page: TemplatePageType,
): Promise<{ template: TemplateFile; themeKey: ResolvedStorefrontTheme["storefrontKey"] }> {
  const { storefrontKey: themeKey, manifest, webTheme } = resolved;
  const fromApi = await loadTemplateForPage(webTheme?.manifestPath ?? null, manifest, page);
  const baseTemplate = fromApi ?? defaultTemplateForPage(page);
  const withTenant = applyTenantContentOverrides(baseTemplate, resolved.contentOverrides, page);
  const withBranding = mergeStorefrontBrandingIntoTemplate(withTenant, resolved.branding ?? null);
  const locale = await loadLocale({
    manifestPath: webTheme?.manifestPath ?? null,
    manifest,
    languageCode: resolved.selectedLanguageCode,
    scope: `storefront:${webTheme?.id ?? themeKey}`,
  });
  const template = localizeTemplate(withBranding, resolved.selectedLanguageCode, locale);
  return { template, themeKey };
}

function defaultTemplateForPage(page: TemplatePageType): TemplateFile {
  // A theme package is the only source of storefront structure. Returning an
  // empty template makes an incomplete package visible instead of silently
  // rendering a hard-coded demo storefront.
  void page;
  return { sections: [] };
}
