import { z } from "zod";
import { SECTION_CATEGORY_KEYS, type SectionCategory } from "./section-categories";
import { resolveSectionCategory } from "./section-type-taxonomy";

const SectionCategorySchema = z.enum(
  SECTION_CATEGORY_KEYS as unknown as [SectionCategory, ...SectionCategory[]],
);

/** Single editor field → auto-generated form control in distributor / future builder. */
export const SectionSettingFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "textarea", "number", "boolean", "image", "url", "select"]),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  /** Required when `type` is `select`. */
  options: z.array(z.object({ value: z.string().min(1), label: z.string().min(1) })).optional(),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export type SectionSettingField = z.infer<typeof SectionSettingFieldSchema>;

/**
 * Section-level editor contract (platform + optional theme override).
 * `category` is optional in JSON — if omitted, resolved from `section-type-taxonomy.ts` using `name`.
 */
export const SectionEditorDefinitionSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().min(1),
    category: SectionCategorySchema.optional(),
    variants: z.array(z.string().min(1)).optional(),
    settings: z.array(SectionSettingFieldSchema),
    /** Block `type` values allowed inside this section (when using block-based layout). */
    allowed_blocks: z.array(z.string().min(1)).optional(),
  })
  .strict()
  .transform((v) => ({
    ...v,
    category: resolveSectionCategory(v.name, v.category),
  }));

export type SectionEditorDefinition = z.infer<typeof SectionEditorDefinitionSchema>;

export const BlockEditorDefinitionSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().min(1).optional(),
    settings: z.array(SectionSettingFieldSchema),
  })
  .strict();

export type BlockEditorDefinition = z.infer<typeof BlockEditorDefinitionSchema>;

export function parseSectionEditorDefinition(raw: unknown): SectionEditorDefinition {
  return SectionEditorDefinitionSchema.parse(raw);
}

export function parseBlockEditorDefinition(raw: unknown): BlockEditorDefinition {
  return BlockEditorDefinitionSchema.parse(raw);
}

/** Optional per-variant field overlay (`sections/variants/<type>.<variant>.schema.json`). */
export const SectionVariantOverlaySchema = z
  .object({
    variant: z.string().min(1),
    settings: z.array(SectionSettingFieldSchema).optional(),
    allowed_blocks: z.array(z.string().min(1)).optional(),
  })
  .strict();

export type SectionVariantOverlay = z.infer<typeof SectionVariantOverlaySchema>;

export function parseSectionVariantOverlay(raw: unknown): SectionVariantOverlay {
  return SectionVariantOverlaySchema.parse(raw);
}
