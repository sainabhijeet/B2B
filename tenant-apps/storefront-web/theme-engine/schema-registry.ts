/**
 * Platform section / block editor schemas (bundled at build time).
 *
 * Architecture: **hybrid (Option C)** — canonical definitions live in the platform so the engine
 * and CI can validate them with zero network cost; a theme ZIP may ship `sections/*.schema.json`
 * overrides that are merged via `mergeSectionEditorDefinitions` after fetch (cache by theme version).
 */

import { filterVariantsForTheme } from "@/engine/theme-capabilities";
import { filterToPhase1Blocks } from "./block-catalog";
import { ALL_ECOMMERCE_SECTION_TYPES } from "@/registry/sectionCatalog";
import blockBadge from "./blocks/badge.schema.json";
import blockButton from "./blocks/button.schema.json";
import blockCategoryCard from "./blocks/category-card.schema.json";
import blockDivider from "./blocks/divider.schema.json";
import blockHeading from "./blocks/heading.schema.json";
import blockIconText from "./blocks/icon-text.schema.json";
import blockImage from "./blocks/image.schema.json";
import blockProductCard from "./blocks/product-card.schema.json";
import blockSpacer from "./blocks/spacer.schema.json";
import blockText from "./blocks/text.schema.json";
import sectionCategoryGrid from "./sections/category-grid.schema.json";
import sectionCollectionGrid from "./sections/collection-grid.schema.json";
import sectionHeroBanner from "./sections/hero-banner.schema.json";
import sectionProductGrid from "./sections/product-grid.schema.json";
import sectionTestimonial from "./sections/testimonial.schema.json";
import heroBannerSplit from "./sections/variants/hero-banner.split.schema.json";
import { mergeSectionWithVariantOverlay } from "./section-variant-merge";
import { getSectionCategory } from "./section-type-taxonomy";
import {
  parseBlockEditorDefinition,
  parseSectionEditorDefinition,
  parseSectionVariantOverlay,
  type BlockEditorDefinition,
  type SectionEditorDefinition,
} from "./section-schema.zod";

/** Statically known variant overlays (`sections/variants/<type>.<variant>.schema.json`). Add imports as you ship files. */
const VARIANT_OVERLAY_BY_KEY: Record<string, unknown> = {
  "hero-banner.split": heroBannerSplit,
};

function variantOverlayKey(sectionType: string, variant: string): string {
  return `${sectionType.trim().toLowerCase()}.${variant.trim().toLowerCase()}`;
}

const RAW_SECTIONS: unknown[] = [
  sectionHeroBanner,
  sectionProductGrid,
  sectionCategoryGrid,
  sectionCollectionGrid,
  sectionTestimonial,
];

const RAW_BLOCKS: unknown[] = [
  blockHeading,
  blockText,
  blockButton,
  blockImage,
  blockIconText,
  blockSpacer,
  blockDivider,
  blockBadge,
  blockProductCard,
  blockCategoryCard,
];

function buildSectionMap(list: unknown[]): Map<string, SectionEditorDefinition> {
  const m = new Map<string, SectionEditorDefinition>();
  for (const raw of list) {
    const parsed = parseSectionEditorDefinition(raw);
    m.set(parsed.name, parsed);
  }
  return m;
}

function buildBlockMap(list: unknown[]): Map<string, BlockEditorDefinition> {
  const m = new Map<string, BlockEditorDefinition>();
  for (const raw of list) {
    const parsed = parseBlockEditorDefinition(raw);
    m.set(parsed.name, parsed);
  }
  return m;
}

const platformSections = buildSectionMap(RAW_SECTIONS);
const platformBlocks = buildBlockMap(RAW_BLOCKS);

export function listPlatformSectionSchemas(): SectionEditorDefinition[] {
  return [...platformSections.values()];
}

function getSectionDefinitionOrMinimal(typeKey: string): SectionEditorDefinition {
  const t = typeKey.trim().toLowerCase();
  const hit = platformSections.get(t);
  if (hit) return hit;
  return {
    name: t,
    label: humanizeSectionKey(t),
    category: getSectionCategory(t),
    settings: [],
  };
}

/** Declared variant ids for a section type (from base schema); falls back to `["default"]`. */
export function getSectionVariants(sectionType: string): string[] {
  const s = getSectionDefinitionOrMinimal(sectionType);
  if (s.variants?.length) return [...s.variants];
  return ["default"];
}

/** First variant in schema order — use when template JSON omits `variant`. */
export function getDefaultSectionVariant(sectionType: string): string {
  const v = getSectionVariants(sectionType);
  return v[0] ?? "default";
}

/**
 * Base section schema + optional `sections/variants/<type>.<variant>.schema.json` overlay
 * (extra settings / allowed_blocks).
 */
export function resolveSectionEditorSchema(
  sectionType: string,
  variant?: string | null,
): SectionEditorDefinition {
  const t = sectionType.trim().toLowerCase();
  const base = getSectionDefinitionOrMinimal(t);
  const v = variant?.trim().toLowerCase();
  if (!v) return base;
  const raw = VARIANT_OVERLAY_BY_KEY[variantOverlayKey(t, v)];
  if (!raw) return base;
  try {
    const overlay = parseSectionVariantOverlay(raw);
    if (overlay.variant.trim().toLowerCase() !== v) return base;
    return mergeSectionWithVariantOverlay(base, overlay);
  } catch {
    return base;
  }
}

/** Variant picker options after `theme.json` `capabilities.variants` filtering. */
export function getSectionVariantsForTheme(
  manifest: Record<string, unknown> | null | undefined,
  sectionType: string,
): string[] {
  return filterVariantsForTheme(manifest, sectionType, getSectionVariants(sectionType));
}

function humanizeSectionKey(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Full picker list: rich schemas from JSON where present, plus minimal catalog definitions
 * (`settings: []`) so all ~169 types appear under taxonomy groups until each gets a `.schema.json`.
 */
export function listAllSectionDefinitionsForPicker(): SectionEditorDefinition[] {
  const byName = new Map<string, SectionEditorDefinition>();
  for (const s of platformSections.values()) {
    byName.set(s.name, s);
  }
  for (const name of ALL_ECOMMERCE_SECTION_TYPES) {
    if (byName.has(name)) continue;
    byName.set(name, {
      name,
      label: humanizeSectionKey(name),
      category: getSectionCategory(name),
      settings: [],
    });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function listPlatformBlockSchemas(): BlockEditorDefinition[] {
  return [...platformBlocks.values()];
}

/** Phase-1 B2B subset — see `block-catalog.ts`. */
export function listPhase1BlockSchemas(): BlockEditorDefinition[] {
  return filterToPhase1Blocks(listPlatformBlockSchemas());
}

export function getPlatformSectionSchema(name: string): SectionEditorDefinition | null {
  return platformSections.get(name) ?? null;
}

export function getPlatformBlockSchema(name: string): BlockEditorDefinition | null {
  return platformBlocks.get(name) ?? null;
}

/**
 * Filter platform schemas by manifest / API allow-list (`null` or empty → no restriction).
 */
export function filterSectionsByAllowList(
  sections: SectionEditorDefinition[],
  allowed: string[] | null | undefined,
): SectionEditorDefinition[] {
  if (!allowed?.length) return sections;
  const set = new Set(allowed.map((x) => x.trim().toLowerCase()).filter(Boolean));
  return sections.filter((s) => set.has(s.name.trim().toLowerCase()));
}

/** Block picker for a section: uses `section.allowed_blocks` when set. */
export function filterBlocksForSection(
  section: SectionEditorDefinition | null | undefined,
  blocks: BlockEditorDefinition[],
): BlockEditorDefinition[] {
  if (!section?.allowed_blocks?.length) return blocks;
  const set = new Set(section.allowed_blocks.map((x) => x.trim().toLowerCase()).filter(Boolean));
  return blocks.filter((b) => set.has(b.name.trim().toLowerCase()));
}
