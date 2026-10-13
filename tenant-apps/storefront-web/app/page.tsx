import { loadThemeComponentSchemas, loadThemeCssText } from "@/engine/template-loader";
import TemplateRenderer from "@/engine/template-renderer";
import { loadHomeTemplateChain, resolveStorefrontTheme } from "@/engine/theme-loader";
import { loadThemeTokenVarsCss, tokenOverridesToCss } from "@/engine/token-loader";
import StorefrontLocaleFrame from "@/components/StorefrontLocaleFrame";
import PreviewBridge from "@/components/PreviewBridge";
import { createLanguageContext } from "@/lib/localization-service";
import { missingTranslations, translate } from "@/lib/translation-engine";
import { decodeThemePreviewState } from "@/lib/theme-preview-contract";
import { storefrontDisplayName } from "@/lib/resolve-storefront-theme";

type Search = Promise<{ theme?: string | string[]; tenant?: string | string[]; tenantId?: string | string[]; previewMode?: string | string[]; previewLanguage?: string | string[]; previewState?: string | string[]; previewPrimaryColor?: string | string[]; previewSecondaryColor?: string | string[]; previewFontFamily?: string | string[]; previewBorderRadius?: string | string[] }>;

export default async function HomePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const raw = sp.theme;
  const preview = Array.isArray(raw) ? raw[0] : raw;
  const rawTenant = sp.tenant;
  const rawTenantId = sp.tenantId;
  const tenantSlug = Array.isArray(rawTenant) ? rawTenant[0] : rawTenant;
  const tenantId = Array.isArray(rawTenantId) ? rawTenantId[0] : rawTenantId;
  const value = (item: string | string[] | undefined) => Array.isArray(item) ? item[0] : item;
  const previewMode = value(sp.previewMode) === "1";
  const previewLanguage = value(sp.previewLanguage);
  const previewState = decodeThemePreviewState(value(sp.previewState));
  const previewTokenOverrides = {
    ...(value(sp.previewPrimaryColor) ? { primary: value(sp.previewPrimaryColor) } : {}),
    ...(value(sp.previewSecondaryColor) ? { secondary: value(sp.previewSecondaryColor) } : {}),
    ...(value(sp.previewFontFamily) ? { fontFamily: value(sp.previewFontFamily) } : {}),
    ...(value(sp.previewBorderRadius) ? { borderRadius: value(sp.previewBorderRadius) } : {}),
  };

  const resolved = await resolveStorefrontTheme(preview ?? null, { tenantId, tenantSlug, previewMode, previewLanguageCode: previewLanguage, previewTokenOverrides, previewState });
  const t = (text: string) => translate(text, resolved.selectedLanguageCode);
  const { template, themeKey } = await loadHomeTemplateChain(resolved);
  const themeCss = await loadThemeCssText(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tokenVarsCss = await loadThemeTokenVarsCss(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const tenantTokenCss = tokenOverridesToCss(resolved.tokenOverrides);
  const componentSchemas = await loadThemeComponentSchemas(resolved.webTheme?.manifestPath ?? null, resolved.manifest);
  const missing = previewMode ? missingTranslations(template, resolved.selectedLanguageCode) : [];
  const languageContext = createLanguageContext(resolved.selectedLanguageCode);

  return (
    <>
      <PreviewBridge enabled={previewMode} language={resolved.selectedLanguageCode} direction={languageContext.direction} missingTranslations={missing} />
      {themeCss ? <style data-theme-runtime-css dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      {tokenVarsCss ? <style data-theme-token-vars dangerouslySetInnerHTML={{ __html: tokenVarsCss }} /> : null}
      {tenantTokenCss ? <style data-tenant-token-vars dangerouslySetInnerHTML={{ __html: tenantTokenCss }} /> : null}
      <StorefrontLocaleFrame languageCode={resolved.selectedLanguageCode} className={`theme-${String(themeKey)}`}>
        {template.sections.length ? (
          <TemplateRenderer
            template={template}
            themeKey={themeKey}
            componentSchemas={componentSchemas}
            languageCode={resolved.selectedLanguageCode}
            sharedSectionProps={{
              logoText: storefrontDisplayName(resolved),
              logoImageUrl: resolved.branding?.logoUrl || resolved.branding?.logoDataUrl || undefined,
              industryName: resolved.branding?.industryName || undefined,
            }}
          />
        ) : (
          <main className="mx-auto my-16 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-8 text-amber-950">
            <h1 className="text-xl font-semibold">{t("Theme setup incomplete")}</h1>
            <p className="mt-2 text-sm">
              {t("The selected theme does not provide a valid home template. Upload a complete theme package or select another theme.")}
            </p>
          </main>
        )}
      </StorefrontLocaleFrame>
    </>
  );
}
