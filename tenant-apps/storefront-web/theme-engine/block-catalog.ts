/**
 * Phase-1 B2B builder: minimal composable blocks (no 50-type explosion).
 * Use with `listPlatformBlockSchemas()` + `filterBlocksForSection()` + `filterToPhase1Blocks()`.
 */

import type { BlockEditorDefinition } from "./section-schema.zod";

export const PHASE_1_BLOCK_TYPES = [
  "heading",
  "text",
  "button",
  "image",
  "icon-text",
  "spacer",
  "divider",
  "badge",
  /** Optional — often covered by product-grid / category-grid sections instead. */
  "product-card",
  "category-card",
] as const;

export type Phase1BlockType = (typeof PHASE_1_BLOCK_TYPES)[number];

const PHASE_1_SET = new Set<string>(PHASE_1_BLOCK_TYPES as unknown as string[]);

export function isPhase1BlockType(name: string): boolean {
  return PHASE_1_SET.has(name.trim().toLowerCase());
}

export function listPhase1BlockTypeNames(): string[] {
  return [...PHASE_1_BLOCK_TYPES];
}

export function filterToPhase1Blocks(blocks: BlockEditorDefinition[]): BlockEditorDefinition[] {
  return blocks.filter((b) => isPhase1BlockType(b.name));
}
