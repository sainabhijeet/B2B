/**
 * Section presets — starter `variant` + `settings` bundles for fast builder UX.
 * Platform JSON is bundled explicitly; theme ZIP can pass merged files into `mergeSectionPresetsFiles`.
 */

import categoryGridPresets from "./presets/category-grid.presets.json";
import heroBannerPresets from "./presets/hero-banner.presets.json";
import productGridPresets from "./presets/product-grid.presets.json";
import {
  parseSectionPresetsFile,
  type SectionPresetEntry,
  type SectionPresetsFile,
} from "./preset-schema.zod";
import { getDefaultSectionVariant, getSectionVariantsForTheme } from "./schema-registry";

const PLATFORM_PRESET_RAW: Record<string, unknown> = {
  "hero-banner": heroBannerPresets,
  "product-grid": productGridPresets,
  "category-grid": categoryGridPresets,
};

const PLATFORM_PRESETS_PARSED: Map<string, SectionPresetsFile> = new Map();
for (const [key, raw] of Object.entries(PLATFORM_PRESET_RAW)) {
  const parsed = parseSectionPresetsFile(raw);
  const k = key.trim().toLowerCase();
  if (parsed.section.trim().toLowerCase() !== k) {
    throw new Error(`Presets file key "${key}" must match "section" field "${parsed.section}".`);
  }
  PLATFORM_PRESETS_PARSED.set(k, parsed);
}

function normalizeSectionKey(sectionType: string): string {
  return sectionType.trim().toLowerCase();
}

/** Merge platform presets with optional theme ZIP file (same shape). Theme entries override by `id`, new ids append. */
export function mergeSectionPresetsFiles(
  sectionType: string,
  themePresetsFile: unknown | null | undefined,
): SectionPresetEntry[] {
  const k = normalizeSectionKey(sectionType);
  const platform = PLATFORM_PRESETS_PARSED.get(k);
  const base = platform?.presets ?? [];
  if (!themePresetsFile) return [...base];
  const theme = parseSectionPresetsFile(themePresetsFile);
  if (normalizeSectionKey(theme.section) !== k) return [...base];
  const byId = new Map<string, SectionPresetEntry>();
  for (const p of base) {
    byId.set(p.id, p);
  }
  for (const p of theme.presets) {
    byId.set(p.id, p);
  }
  return [...byId.values()];
}

/** Picker rows: `{ id, label }` only. */
export function getSectionPresets(
  sectionType: string,
  themePresetsFile?: unknown | null,
): Array<{ id: string; label: string; variant?: string }> {
  return mergeSectionPresetsFiles(sectionType, themePresetsFile).map((p) => ({
    id: p.id,
    label: p.label,
    ...(p.variant ? { variant: p.variant } : {}),
  }));
}

export function getPreset(
  sectionType: string,
  presetId: string,
  themePresetsFile?: unknown | null,
): SectionPresetEntry | null {
  const id = presetId.trim().toLowerCase();
  const list = mergeSectionPresetsFiles(sectionType, themePresetsFile);
  return list.find((p) => p.id.toLowerCase() === id) ?? null;
}

/**
 * Template / editor payload after user picks a preset.
 * Respects `capabilities.variants` when `manifest` is passed (variant clamped to first allowed if needed).
 */
export function applyPreset(
  sectionType: string,
  presetId: string,
  opts?: { manifest?: Record<string, unknown> | null; themePresetsFile?: unknown | null },
): { type: string; variant: string; settings: Record<string, unknown> } | null {
  const k = normalizeSectionKey(sectionType);
  const preset = getPreset(k, presetId, opts?.themePresetsFile);
  if (!preset) return null;
  let variant = preset.variant ?? getDefaultSectionVariant(k);
  const manifest = opts?.manifest;
  if (manifest) {
    const allowed = getSectionVariantsForTheme(manifest, k);
    const norm = variant.trim().toLowerCase();
    if (!allowed.map((x) => x.toLowerCase()).includes(norm)) {
      variant = allowed[0] ?? variant;
    }
  }
  const settings: Record<string, unknown> = { ...preset.settings };
  return { type: k, variant, settings };
}
