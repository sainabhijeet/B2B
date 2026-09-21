import { SECTION_CATEGORY_DISPLAY_ORDER, type SectionCategory } from "./section-categories";
import type { SectionEditorDefinition } from "./section-schema.zod";

export type SectionsByCategory = Partial<Record<SectionCategory, SectionEditorDefinition[]>>;

/**
 * Groups section editor schemas for picker UI (Shopify-style headings).
 * Categories with no sections are omitted.
 */
export function groupSectionsByCategory(sections: SectionEditorDefinition[]): SectionsByCategory {
  const acc: SectionsByCategory = {};
  for (const s of sections) {
    const cat = s.category;
    acc[cat] ??= [];
    acc[cat]!.push(s);
  }
  for (const k of Object.keys(acc) as SectionCategory[]) {
    acc[k]!.sort((a, b) => a.label.localeCompare(b.label));
  }
  return acc;
}

/** Flatten grouped sections in a stable sidebar order (empty categories skipped). */
export function orderedSectionGroups(sections: SectionEditorDefinition[]): Array<{
  category: SectionCategory;
  sections: SectionEditorDefinition[];
}> {
  const grouped = groupSectionsByCategory(sections);
  const out: Array<{ category: SectionCategory; sections: SectionEditorDefinition[] }> = [];
  for (const category of SECTION_CATEGORY_DISPLAY_ORDER) {
    const list = grouped[category];
    if (list?.length) out.push({ category, sections: list });
  }
  return out;
}
