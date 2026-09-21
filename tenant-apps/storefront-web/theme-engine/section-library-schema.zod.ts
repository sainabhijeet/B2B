import { z } from "zod";
import { SectionInstanceSchema } from "@/engine/schema/theme-engine.schema";

/** Ready-made page layouts for distributor “Choose layout” (platform; theme ZIP can merge later). */
export const SectionLibraryTemplateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    sections: z.array(SectionInstanceSchema),
  })
  .strict();

export type SectionLibraryTemplate = z.infer<typeof SectionLibraryTemplateSchema>;

export function parseSectionLibraryTemplate(raw: unknown): SectionLibraryTemplate {
  return SectionLibraryTemplateSchema.parse(raw);
}
