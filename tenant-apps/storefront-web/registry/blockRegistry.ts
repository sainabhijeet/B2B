import type { ComponentType } from "react";
import BadgeBlock from "@/blocks/BadgeBlock";
import ButtonBlock from "@/blocks/ButtonBlock";
import CategoryCardBlock from "@/blocks/CategoryCardBlock";
import DividerBlock from "@/blocks/DividerBlock";
import HeadingBlock from "@/blocks/HeadingBlock";
import IconTextBlock from "@/blocks/IconTextBlock";
import ImageBlock from "@/blocks/ImageBlock";
import ProductCardBlock from "@/blocks/ProductCardBlock";
import SpacerBlock from "@/blocks/SpacerBlock";
import TextBlock from "@/blocks/TextBlock";

export type BlockProps = Record<string, unknown>;

/** Phase-1 B2B blocks + default variant slot. Extend per block when you add real variant components. */
export const blockRegistry: Record<string, Record<string, ComponentType<BlockProps>>> = {
  heading: { default: HeadingBlock },
  text: { default: TextBlock },
  button: { default: ButtonBlock },
  image: { default: ImageBlock },
  "icon-text": { default: IconTextBlock },
  spacer: { default: SpacerBlock },
  divider: { default: DividerBlock },
  badge: { default: BadgeBlock },
  "product-card": { default: ProductCardBlock },
  "category-card": { default: CategoryCardBlock },
};

const BLOCK_ALIASES: Record<string, string> = {
  cta: "button",
  link: "button",
  paragraph: "text",
  picture: "image",
};

export function resolveBlockFromRegistry(
  id: string,
  variant?: string | null,
): ComponentType<BlockProps> | null {
  const key = String(id ?? "").trim().toLowerCase();
  const mapped = BLOCK_ALIASES[key] ?? key;
  const variants = blockRegistry[mapped];
  if (!variants) return null;
  if (variant != null && String(variant).trim() !== "") {
    const byVariant = variants[String(variant).trim().toLowerCase()];
    if (byVariant) return byVariant;
  }
  return variants.default ?? null;
}

function makeUnsupportedBlock(blockType: string): ComponentType<BlockProps> {
  const Wrapped: ComponentType<BlockProps> = () => null;
  Wrapped.displayName = `UnsupportedBlock(${blockType})`;
  return Wrapped;
}

/** Unknown optional theme blocks are omitted without exposing editor diagnostics to shoppers. */
export function getBlockComponent(id: string, variant?: string | null): ComponentType<BlockProps> {
  const resolved = resolveBlockFromRegistry(id, variant);
  if (resolved) return resolved;
  const key = String(id ?? "").trim().toLowerCase();
  const mapped = BLOCK_ALIASES[key] ?? key;
  return makeUnsupportedBlock(mapped || "unknown");
}
