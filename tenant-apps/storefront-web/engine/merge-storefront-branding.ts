import type { TemplateFile } from "@/engine/schema/theme-engine.schema";

export type StorefrontBranding = {
  storeName?: string | null;
  logoUrl: string | null;
  logoDataUrl: string | null;
  tagline: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  industryName?: string | null;
};

/**
 * Injects `tenant_branding` logo URL into header sections so the theme JSON need not hardcode it.
 */
export function mergeStorefrontBrandingIntoTemplate(
  template: TemplateFile,
  branding: StorefrontBranding | null | undefined,
): TemplateFile {
  if (!branding) return template;
  const logoSrc =
    (typeof branding.logoUrl === "string" && branding.logoUrl.trim()) ||
    (typeof branding.logoDataUrl === "string" && branding.logoDataUrl.trim()) ||
    "";
  const industryName =
    typeof branding.industryName === "string" && branding.industryName.trim()
      ? branding.industryName.trim()
      : "";
  const storeName =
    typeof branding.storeName === "string" && branding.storeName.trim()
      ? branding.storeName.trim()
      : "";
  const primaryColor =
    typeof branding.primaryColor === "string" && branding.primaryColor.trim()
      ? branding.primaryColor.trim()
      : "";
  const secondaryColor =
    typeof branding.secondaryColor === "string" && branding.secondaryColor.trim()
      ? branding.secondaryColor.trim()
      : "";
  if (!logoSrc && !storeName && !industryName && !primaryColor && !secondaryColor) return template;

  const sections = template.sections.map((section) => {
    const t = String(section.type ?? section.component ?? "").toLowerCase();
    if (t !== "header" && t !== "header-basic" && !t.includes("hero")) return section;
    const settings = { ...(section.settings ?? {}) };
    if ((t === "header" || t === "header-basic") && logoSrc) settings.logoImageUrl = logoSrc;
    if ((t === "header" || t === "header-basic") && storeName) settings.logoText = storeName;
    if ((t === "header" || t === "header-basic") && industryName) settings.industryName = industryName;
    if ((t === "header" || t === "header-basic") && primaryColor) settings.primaryColor = primaryColor;
    if ((t === "header" || t === "header-basic") && secondaryColor) settings.secondaryColor = secondaryColor;
    if (t.includes("hero") && industryName && typeof settings.eyebrow !== "string") {
      settings.eyebrow = industryName;
    }
    return {
      ...section,
      settings,
    };
  });
  return { ...template, sections };
}
