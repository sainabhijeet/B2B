import type { TemplateFile } from "@/engine/schema/theme-engine.schema";

export type TenantSectionOverride = {
  sectionKey: string;
  enabled?: boolean;
  orderIndex?: number;
  settings?: Record<string, unknown>;
};

export type TenantContentOverrides = {
  pages?: Record<string, { sections?: TenantSectionOverride[] }>;
  sections?: TenantSectionOverride[];
};

/**
 * Applies tenant DB overrides on top of theme template defaults:
 * - override settings
 * - optionally hide sections
 * - optionally reorder sections
 */
export function applyTenantContentOverrides(
  template: TemplateFile,
  overrides: TenantContentOverrides | null | undefined,
  page: string,
): TemplateFile {
  const pageKey = String(page ?? "").trim().toLowerCase();
  const rows = overrides?.pages?.[pageKey]?.sections ?? overrides?.sections;
  if (!rows?.length) return template;

  const byKey = new Map<string, TenantSectionOverride>();
  for (const row of rows) {
    const k = row.sectionKey?.trim().toLowerCase();
    if (!k) continue;
    byKey.set(k, row);
  }

  const mapped = template.sections
    .map((section, idx) => {
      const key = String(section.id ?? section.type ?? section.component ?? "").trim().toLowerCase();
      const row = byKey.get(key);
      if (!row) return { section, orderIndex: idx, enabled: true };
      return {
        section: {
          ...section,
          settings: {
            ...(section.settings ?? {}),
            ...(row.settings ?? {}),
          },
        },
        orderIndex: typeof row.orderIndex === "number" ? row.orderIndex : idx,
        enabled: row.enabled !== false,
      };
    })
    .filter((x) => x.enabled);

  const sections = mapped.sort((a, b) => a.orderIndex - b.orderIndex).map((x) => x.section);

  return { ...template, sections };
}
