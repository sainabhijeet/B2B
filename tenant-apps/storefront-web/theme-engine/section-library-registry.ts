/**
 * Platform section library — starter page layouts (`section-library/*.json`).
 * Theme ZIP can supply the same shape later; merge with `mergeSectionLibraryTemplate` (same rules as presets).
 */

import type { SectionInstance } from "@/engine/schema/theme-engine.schema";
import brandShowcase from "./section-library/brand-showcase.json";
import homepage from "./section-library/homepage.json";
import marketingLanding from "./section-library/marketing-landing.json";
import plp from "./section-library/plp.json";
import { parseSectionLibraryTemplate, type SectionLibraryTemplate } from "./section-library-schema.zod";

const RAW_LIBRARY: unknown[] = [homepage, plp, brandShowcase, marketingLanding];

const PARSED: SectionLibraryTemplate[] = RAW_LIBRARY.map((raw) => parseSectionLibraryTemplate(raw));
const BY_ID = new Map(PARSED.map((t) => [t.id.trim().toLowerCase(), t]));

export function listSectionLibraryTemplates(): Array<{ id: string; name: string; description?: string }> {
  return PARSED.map((t) => ({
    id: t.id,
    name: t.name,
    ...(t.description ? { description: t.description } : {}),
  }));
}

export function getSectionLibraryTemplate(id: string): SectionLibraryTemplate | null {
  return BY_ID.get(id.trim().toLowerCase()) ?? null;
}

/** Deep clone sections for applying to tenant state / preview. */
export function cloneSectionsFromTemplate(id: string): SectionInstance[] | null {
  const t = getSectionLibraryTemplate(id);
  if (!t) return null;
  return JSON.parse(JSON.stringify(t.sections)) as SectionInstance[];
}

/**
 * Theme override: same `id` replaces platform row; new ids append.
 * `themeTemplate` must parse as `SectionLibraryTemplate` with matching `id`.
 */
export function mergeSectionLibraryTemplate(
  platformId: string,
  themeTemplate: unknown | null | undefined,
): SectionLibraryTemplate | null {
  const base = getSectionLibraryTemplate(platformId);
  if (!themeTemplate) return base;
  const theme = parseSectionLibraryTemplate(themeTemplate);
  if (theme.id.trim().toLowerCase() !== platformId.trim().toLowerCase()) return base;
  return theme;
}
