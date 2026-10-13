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
};

export default async function TemplateRenderer({ template, themeKey, componentSchemas, languageCode, sharedSectionProps }: Props) {
  // The storefront shell owns global navigation and the footer so every route
  // gets one consistent, API-resolved frame. Template copies are skipped.
  const sections = (Array.isArray(template?.sections) ? template.sections : []).filter((section) => {
    const type = String(section.type ?? section.component ?? section.id ?? "").toLowerCase();
    return type !== "header" && type !== "header-basic" && type !== "footer" && type !== "footer-basic" && type !== "footer-columns";
  });
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
        />
      ))}
    </>
  );
}
