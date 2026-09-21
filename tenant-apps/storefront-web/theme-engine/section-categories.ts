/**
 * Section taxonomy for Website Builder — groups ~169 catalog keys into ordered UI buckets.
 * Data model uses granular keys; pickers can collapse "primary 8" vs "more" via `SECTION_CATEGORY_DISPLAY_ORDER`.
 */

export const SECTION_CATEGORY_KEYS = [
  "layout",
  "hero",
  "products",
  "categories",
  "content",
  "marketing",
  "trust",
  "brand",
  "footer",
  "b2b",
  "utility",
  "advanced",
] as const;

export type SectionCategory = (typeof SECTION_CATEGORY_KEYS)[number];

export function isSectionCategory(value: string): value is SectionCategory {
  return (SECTION_CATEGORY_KEYS as readonly string[]).includes(value);
}

/** Human labels (builder sidebar / accordions). */
export const SECTION_CATEGORY_LABELS: Record<SectionCategory, string> = {
  layout: "Layout",
  hero: "Hero",
  products: "Products",
  categories: "Categories",
  content: "Content",
  marketing: "Marketing",
  trust: "Trust",
  brand: "Brand",
  footer: "Footer",
  b2b: "B2B",
  utility: "Utility",
  advanced: "Advanced",
};

/**
 * Default sidebar order. First eight match the "Shopify-style" primary nav; rest follow.
 * UI may merge `brand` into `marketing` visually — data still keeps `brand` for taxonomy clarity.
 */
export const SECTION_CATEGORY_DISPLAY_ORDER: readonly SectionCategory[] = [
  "layout",
  "hero",
  "products",
  "categories",
  "content",
  "marketing",
  "trust",
  "footer",
  "brand",
  "b2b",
  "utility",
  "advanced",
] as const;

/** Keys shown as the main eight tabs (footer closes the primary row). */
export const SECTION_CATEGORY_PRIMARY_EIGHT: readonly SectionCategory[] = [
  "layout",
  "hero",
  "products",
  "categories",
  "content",
  "marketing",
  "trust",
  "footer",
] as const;
