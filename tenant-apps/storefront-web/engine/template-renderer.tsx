import type { ThemeKey } from "@/lib/theme-config";
import type { TemplateFile } from "@/engine/schema/theme-engine.schema";
import SectionRenderer from "@/engine/section-renderer";
import type { ComponentSchema } from "@/engine/template-loader";

type Props = {
  template: TemplateFile;
  themeKey: ThemeKey;
  componentSchemas?: Record<string, ComponentSchema>;
  languageCode?: string;
};

export default async function TemplateRenderer({ template, themeKey, componentSchemas, languageCode }: Props) {
  const sections = Array.isArray(template?.sections) ? template.sections : [];
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
        />
      ))}
    </>
  );
}
