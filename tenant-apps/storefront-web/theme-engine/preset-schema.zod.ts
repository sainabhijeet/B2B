import { z } from "zod";

/** One Shopify-style starter row for the section picker. */
export const SectionPresetEntrySchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    /** When omitted, builder uses `getDefaultSectionVariant(section)`. */
    variant: z.string().min(1).optional(),
    /** Flat settings merged into template JSON `settings` (and editor form). */
    settings: z.record(z.unknown()).default({}),
  })
  .strict();

export type SectionPresetEntry = z.infer<typeof SectionPresetEntrySchema>;

export const SectionPresetsFileSchema = z
  .object({
    section: z.string().min(1),
    presets: z.array(SectionPresetEntrySchema),
  })
  .strict();

export type SectionPresetsFile = z.infer<typeof SectionPresetsFileSchema>;

export function parseSectionPresetsFile(raw: unknown): SectionPresetsFile {
  return SectionPresetsFileSchema.parse(raw);
}
