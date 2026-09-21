import { z } from "zod";

/**
 * Atomic UI inside a section (Model B). Root-level keys other than `type` / `id` / `variant` / `settings`
 * are merged into settings for the block component (Webflow-style shorthand).
 */
export const BlockInstanceSchema = z
  .object({
    id: z.string().min(1).optional(),
    type: z.string().min(1),
    variant: z.string().min(1).optional(),
    settings: z.record(z.unknown()).optional(),
  })
  .passthrough();

/** Multi-column section: each column has its own block list (layout engine). */
export const SectionColumnSchema = z.object({
  id: z.string().min(1).optional(),
  blocks: z.array(BlockInstanceSchema),
});

/** Section-level layout: preset string or grid/flex descriptor (CSS-first). */
export const SectionLayoutDescriptorSchema = z.union([z.string().min(1), z.record(z.unknown())]);

/** Single section instance in a template JSON file (registry-driven; no TSX in theme ZIP). */
export const SectionInstanceSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  variant: z.string().min(1).optional(),
  component: z.string().min(1).optional(),
  settings: z.record(z.unknown()).optional(),
  /** CSS grid / flex / preset — interpreted by `layout-engine`. */
  layout: SectionLayoutDescriptorSchema.optional(),
  /** Flat block list when not using `columns`. */
  blocks: z.array(BlockInstanceSchema).optional(),
  /** Multi-column: mutually exclusive with top-level `blocks` in most themes; engine supports both. */
  columns: z.array(SectionColumnSchema).optional(),
});

export const TemplateFileSchema = z.object({
  sections: z.array(SectionInstanceSchema),
});

export type TemplateFile = z.infer<typeof TemplateFileSchema>;
export type SectionInstance = z.infer<typeof SectionInstanceSchema>;
export type BlockInstance = z.infer<typeof BlockInstanceSchema>;
export type SectionColumn = z.infer<typeof SectionColumnSchema>;
export type SectionLayoutDescriptor = z.infer<typeof SectionLayoutDescriptorSchema>;

const tokenRefObjectSchema = z.object({
  colors: z.string().optional(),
  typography: z.string().optional(),
  spacing: z.string().optional(),
  layout: z.string().optional(),
  radius: z.string().optional(),
  shadows: z.string().optional(),
  breakpoints: z.string().optional(),
});

/** Root theme.json (subset; extra keys allowed for forward compatibility). */
export const ThemeManifestSchema = z
  .object({
    version: z.string().min(1),
    name: z.string().optional(),
    storefrontKey: z.string().optional(),
    industry: z.string().optional(),
    templates: z.record(z.string()).optional(),
    /** Locale JSON files keyed by language code, e.g. { "fr": "locales/fr.json" }. */
    locales: z.record(z.string()).optional(),
    /** Legacy: arbitrary string list on manifest (avoid mixing with `allowedSections`). */
    sections: z.array(z.string()).optional(),
    /**
     * Theme capability manifest: section `type` values this package is designed for.
     * Editors should only offer these; ZIP validation (when non-empty) ensures templates stay in-bounds.
     */
    allowedSections: z.array(z.string().min(1)).optional(),
    allowed_sections: z.array(z.string().min(1)).optional(),
    capabilities: z
      .object({
        allowedSections: z.array(z.string().min(1)).optional(),
        allowed_sections: z.array(z.string().min(1)).optional(),
        allowedBlocks: z.array(z.string().min(1)).optional(),
        allowed_blocks: z.array(z.string().min(1)).optional(),
        /** Per-section allowed variant ids, e.g. `{ "hero-banner": ["center","split"] }`. */
        variants: z.record(z.array(z.string().min(1))).optional(),
      })
      .passthrough()
      .optional(),
    /** Either split token JSON files (paths) or Model B single `tokens.json` bundle path. */
    tokens: z.union([z.string().min(1), tokenRefObjectSchema]).optional(),
    assets: z
      .object({
        css: z.string().optional(),
      })
      .optional(),
    components: z.record(z.string()).optional(),
  })
  .passthrough();

export type ThemeManifest = z.infer<typeof ThemeManifestSchema>;
