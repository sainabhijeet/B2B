import type { StorefrontThemeKey } from "@/lib/storefront-theme-keys";

/** Resolved tenant theme key (registry + templates). */
export type ThemeKey = StorefrontThemeKey | string;

/** Only when API is unreachable or tenant has no theme row yet — not a product “setting”. */
export const STOREFRONT_THEME_FALLBACK: StorefrontThemeKey = "jewellery";
