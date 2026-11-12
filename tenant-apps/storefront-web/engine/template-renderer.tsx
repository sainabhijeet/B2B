import type { ThemeKey } from "@/lib/theme-config";
import type { TemplateFile } from "@/engine/schema/theme-engine.schema";
import SectionRenderer from "@/engine/section-renderer";
import type { ComponentSchema } from "@/engine/template-loader";

type Props = {
  template: TemplateFile;
  themeKey: ThemeKey;
  componentSchemas?: Record<string, ComponentSchema>;
  languageCode?: string;
  sharedSectionProps?: Record<string, unknown>;
  previewCatalog?: boolean;
};

export default async function TemplateRenderer({ template, themeKey, componentSchemas, languageCode, sharedSectionProps, previewCatalog = false }: Props) {
  // The storefront shell owns global navigation and the footer so every route
  // gets one consistent, API-resolved frame. Template copies are skipped.
  const beautyStudioOrder: Record<string, number> = {
    "hero-banner": 1,
    "category-grid": 2,
    "product-grid": 3,
    "promo-banner": 4,
    "image-with-text": 5,
    "feature-list": 6,
    "testimonial-carousel": 7,
    newsletter: 8,
  };
  const sections = (Array.isArray(template?.sections) ? template.sections : []).filter((section) => {
    const type = String(section.type ?? section.component ?? section.id ?? "").toLowerCase();
    return type !== "header" && type !== "header-basic" && type !== "footer" && type !== "footer-basic" && type !== "footer-columns";
  }).map((section, sourceIndex) => ({ section, sourceIndex })).sort((a, b) => {
    const resolvedOrder = (entry: typeof a): number => {
      const explicitOrder = Number(entry.section.settings?.homeOrder);
      if (Number.isFinite(explicitOrder)) return explicitOrder;
      if (entry.section.settings?.designId === "ds-12-web") {
        const type = String(entry.section.type ?? entry.section.component ?? entry.section.id ?? "").toLowerCase();
        return beautyStudioOrder[type] ?? 100 + entry.sourceIndex;
      }
      return Number.NaN;
    };
    const aOrder = resolvedOrder(a);
    const bOrder = resolvedOrder(b);
    const aHasOrder = Number.isFinite(aOrder);
    const bHasOrder = Number.isFinite(bOrder);
    if (aHasOrder && bHasOrder) return aOrder - bOrder || a.sourceIndex - b.sourceIndex;
    if (aHasOrder) return -1;
    if (bHasOrder) return 1;
    return a.sourceIndex - b.sourceIndex;
  }).map(({ section }) => section);
  return (
    <>
      {sections.map((section, i) => (
        <SectionRenderer
          key={`${section.id ?? section.type ?? section.component ?? "section"}-${i}`}
          section={section}
          sectionIndex={i}
          themeKey={themeKey}
          componentSchemas={componentSchemas}
          languageCode={languageCode}
          sharedSectionProps={sharedSectionProps}
          previewCatalog={previewCatalog}
        />
      ))}
    </>
  );
}
