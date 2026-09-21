export { getBlockComponent, resolveBlockFromRegistry } from "@/registry/blockRegistry";
export { filterVariantsForTheme, readAllowedVariantsForSection } from "@/engine/theme-capabilities";
export {
  cloneSectionsFromTemplate,
  getSectionLibraryTemplate,
  listSectionLibraryTemplates,
  mergeSectionLibraryTemplate,
} from "./section-library-registry";
export {
  parseSectionLibraryTemplate,
  SectionLibraryTemplateSchema,
} from "./section-library-schema.zod";
export type { SectionLibraryTemplate } from "./section-library-schema.zod";
export {
  applyPreset,
  getPreset,
  getSectionPresets,
  mergeSectionPresetsFiles,
} from "./preset-registry";
export {
  parseSectionPresetsFile,
  SectionPresetEntrySchema,
  SectionPresetsFileSchema,
} from "./preset-schema.zod";
export type { SectionPresetEntry, SectionPresetsFile } from "./preset-schema.zod";
export { mergeSectionWithVariantOverlay } from "./section-variant-merge";
export {
  mergeSectionEditorDefinitions,
} from "./merge-schemas";
export {
  groupSectionsByCategory,
  orderedSectionGroups,
  type SectionsByCategory,
} from "./section-grouping";
export {
  isSectionCategory,
  SECTION_CATEGORY_DISPLAY_ORDER,
  SECTION_CATEGORY_KEYS,
  SECTION_CATEGORY_LABELS,
  SECTION_CATEGORY_PRIMARY_EIGHT,
  type SectionCategory,
} from "./section-categories";
export {
  getSectionCategory,
  listCatalogTypesMissingTaxonomy,
  resolveSectionCategory,
} from "./section-type-taxonomy";
export {
  filterToPhase1Blocks,
  isPhase1BlockType,
  listPhase1BlockTypeNames,
  PHASE_1_BLOCK_TYPES,
  type Phase1BlockType,
} from "./block-catalog";
export {
  filterBlocksForSection,
  filterSectionsByAllowList,
  getDefaultSectionVariant,
  getPlatformBlockSchema,
  getPlatformSectionSchema,
  getSectionVariants,
  getSectionVariantsForTheme,
  listAllSectionDefinitionsForPicker,
  listPhase1BlockSchemas,
  listPlatformBlockSchemas,
  listPlatformSectionSchemas,
  resolveSectionEditorSchema,
} from "./schema-registry";
export {
  BlockEditorDefinitionSchema,
  parseBlockEditorDefinition,
  parseSectionEditorDefinition,
  parseSectionVariantOverlay,
  SectionEditorDefinitionSchema,
  SectionSettingFieldSchema,
  SectionVariantOverlaySchema,
} from "./section-schema.zod";
export type {
  BlockEditorDefinition,
  SectionEditorDefinition,
  SectionSettingField,
  SectionVariantOverlay,
} from "./section-schema.zod";
