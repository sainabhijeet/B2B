import type { SectionEditorDefinition, SectionSettingField, SectionVariantOverlay } from "./section-schema.zod";

function settingsById(list: SectionSettingField[]): Map<string, SectionSettingField> {
  const m = new Map<string, SectionSettingField>();
  for (const f of list) {
    m.set(f.id, f);
  }
  return m;
}

/**
 * Merges base section editor schema with optional `sections/variants/<type>.<variant>.schema.json` overlay.
 * Same rules as theme merge: base fields first, overlay overrides by `id`, new ids append.
 */
export function mergeSectionWithVariantOverlay(
  base: SectionEditorDefinition,
  overlay: SectionVariantOverlay,
): SectionEditorDefinition {
  const oSettings = overlay.settings;
  const baseMap = settingsById(base.settings);
  const overMap = oSettings ? settingsById(oSettings) : null;
  const mergedSettings: SectionSettingField[] = [];
  const seen = new Set<string>();
  for (const f of base.settings) {
    const t = overMap?.get(f.id);
    mergedSettings.push(t ? { ...f, ...t } : { ...f });
    seen.add(f.id);
  }
  if (overMap) {
    for (const [id, f] of overMap) {
      if (seen.has(id)) continue;
      mergedSettings.push({ ...f });
    }
  }
  const allowed_blocks =
    overlay.allowed_blocks !== undefined ? overlay.allowed_blocks : base.allowed_blocks;
  return {
    ...base,
    settings: mergedSettings,
    allowed_blocks,
  };
}
