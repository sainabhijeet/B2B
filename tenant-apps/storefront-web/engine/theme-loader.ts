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
import type { ThemePreviewCatalog } from "@/lib/resolve-storefront-theme";

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
  const withPreviewCatalog = page === "home"
    ? applyPreviewCatalog(baseTemplate, resolved.previewCatalog ?? null)
    : baseTemplate;
  const withTenant = applyTenantContentOverrides(withPreviewCatalog, resolved.contentOverrides, page);
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

function applyPreviewCatalog(
  template: TemplateFile,
  catalog: ThemePreviewCatalog | null,
): TemplateFile {
  if (!catalog) return template;
  const categories = Array.isArray(catalog.categories) ? catalog.categories : [];
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  const categorySections = new Set(["category-grid", "category-tiles"]);
  const productSections = new Set([
    "product-grid",
    "featured-products",
    "latest-products",
    "best-sellers",
    "product-carousel",
    "product-featured",
    "related-products",
  ]);

  return {
    ...template,
    sections: template.sections.map((section) => {
      const type = String(section.type ?? section.component ?? "").trim().toLowerCase();
      const settings = section.settings ?? {};
      if (categorySections.has(type) && categories.length > 0 && !Array.isArray(settings.categories)) {
        return { ...section, settings: { ...settings, categories } };
      }
      if (productSections.has(type) && products.length > 0 && !Array.isArray(settings.products)) {
        return { ...section, settings: { ...settings, products } };
      }
      return section;
    }),
  };
}

function defaultTemplateForPage(page: TemplatePageType): TemplateFile {
  // A theme package is the only source of storefront structure. Returning an
  // empty template makes an incomplete package visible instead of silently
  // rendering a hard-coded demo storefront.
  void page;
  return { sections: [] };
}
