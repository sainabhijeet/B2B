import { isSectionCategory, type SectionCategory } from "./section-categories";
import type { SectionEditorDefinition, SectionSettingField } from "./section-schema.zod";

function settingsById(list: SectionSettingField[]): Map<string, SectionSettingField> {
  const m = new Map<string, SectionSettingField>();
  for (const f of list) {
    m.set(f.id, f);
  }
  return m;
}

/**
 * Merges platform section schema with theme ZIP override (hybrid model).
 * - `settings`: union order = platform fields first, then theme-only ids appended; same `id` → theme wins.
 * - `variants` / `allowed_blocks`: if theme defines the key (including empty array), theme wins.
 * - `label`: theme wins when non-empty string.
 */
export function mergeSectionEditorDefinitions(
  platform: SectionEditorDefinition,
  theme: Partial<SectionEditorDefinition> | null | undefined,
): SectionEditorDefinition {
  if (!theme) return platform;
  const base = settingsById(platform.settings);
  const over = theme.settings ? settingsById(theme.settings) : null;
  const mergedSettings: SectionSettingField[] = [];
  const seen = new Set<string>();
  for (const f of platform.settings) {
    const t = over?.get(f.id);
    mergedSettings.push(t ? { ...f, ...t } : { ...f });
    seen.add(f.id);
  }
  if (over) {
    for (const [id, f] of over) {
      if (seen.has(id)) continue;
      mergedSettings.push({ ...f });
    }
  }
  const label = theme.label?.trim() ? theme.label.trim() : platform.label;
  const variants = theme.variants !== undefined ? theme.variants : platform.variants;
  const allowed_blocks =
    theme.allowed_blocks !== undefined ? theme.allowed_blocks : platform.allowed_blocks;
  const mergedCategory: SectionCategory =
    theme.category !== undefined &&
    typeof theme.category === "string" &&
    isSectionCategory(theme.category.trim().toLowerCase())
      ? (theme.category.trim().toLowerCase() as SectionCategory)
      : platform.category;
  return {
    name: platform.name,
    label,
    category: mergedCategory,
    variants,
    settings: mergedSettings,
    allowed_blocks,
  };
}
