import type { ThemeKey } from "@/lib/theme-config";
import SectionLayoutView from "@/engine/layout-engine";
import type { SectionInstance } from "@/engine/schema/theme-engine.schema";
import { resolveSectionFromRegistry } from "@/registry/sectionRegistry";
import type { ComponentSchema } from "@/engine/template-loader";

type Props = {
  section: SectionInstance;
  /** Stable index for scoped layout CSS. */
  sectionIndex: number;
  themeKey: ThemeKey;
  componentSchemas?: Record<string, ComponentSchema>;
  languageCode?: string;
};

type PrimitiveType = "string" | "number" | "boolean" | "image" | "array" | "object";

function isTypeMatch(value: unknown, expected: PrimitiveType): boolean {
  if (expected === "image") return typeof value === "string";
  if (expected === "array") return Array.isArray(value);
  if (expected === "object") return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  return typeof value === expected;
}

function validateSettingsAgainstSchema(
  settings: Record<string, unknown>,
  schema: Record<string, unknown> | undefined,
): string[] {
  if (!schema) return [];
  const issues: string[] = [];
  for (const [key, expected] of Object.entries(schema)) {
    const value = settings[key];
    if (value === undefined) continue;
    if (typeof expected !== "string") continue;
    const t = expected.toLowerCase() as PrimitiveType;
    const allowed: PrimitiveType[] = ["string", "number", "boolean", "image", "array", "object"];
    if (!allowed.includes(t)) continue;
    if (!isTypeMatch(value, t)) {
      issues.push(`settings.${key} expected ${expected}, got ${Array.isArray(value) ? "array" : typeof value}`);
    }
  }
  return issues;
}

function contractError(message: string) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="mx-auto mt-4 max-w-6xl rounded-md border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      Theme contract error: {message}
    </div>
  );
}

/** One section from template JSON → registry React component. */
export default async function SectionRenderer({ section, sectionIndex, themeKey, componentSchemas, languageCode }: Props) {
  const rawType = section.type ?? section.id ?? section.component ?? "";
  const type = String(rawType).trim();
  if (!type) return contractError(`section type is missing (${JSON.stringify(section)})`);

  const schema = componentSchemas?.[type.toLowerCase()];
  const effectiveVariant = section.variant ?? schema?.defaultVariant ?? null;
  if (schema?.variants?.length && effectiveVariant && !schema.variants.includes(effectiveVariant)) {
    return contractError(`type "${type}" does not allow variant "${effectiveVariant}"`);
  }

  const Cmp = resolveSectionFromRegistry(type, effectiveVariant);
  if (!Cmp) {
    return contractError(`registry component not found for type "${type}" variant "${effectiveVariant ?? "default"}"`);
  }

  const settings = section.settings ?? {};
  const issues = validateSettingsAgainstSchema(settings, schema?.settings);
  if (issues.length) {
    return contractError(`invalid settings for "${type}": ${issues.join(", ")}`);
  }

  const hasBlockTree =
    (Array.isArray(section.blocks) && section.blocks.length > 0) ||
    (Array.isArray(section.columns) && section.columns.length > 0);
  const scopeId = `${section.id ?? type}-${sectionIndex}`;

  return (
    <div className="theme-section-root w-full" data-section-type={type}>
      {hasBlockTree ? (
        <div className="theme-section-blocks mb-6 w-full">
          <SectionLayoutView
            layout={section.layout}
            blocks={section.blocks}
            columns={section.columns}
            scopeId={scopeId}
            languageCode={languageCode}
          />
        </div>
      ) : null}
      <Cmp {...settings} themeKey={themeKey} variant={effectiveVariant ?? undefined} languageCode={languageCode} />
    </div>
  );
}
