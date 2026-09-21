/** Public, normalized theme manifest for storefront, distributor builder, and APIs (not full `theme.json`). */
export interface ThemeManifestDTO {
  themeId: string;
  version: string;
  allowedSections: string[];
  allowedVariants: Record<string, string[]>;
  allowedBlocks: string[];
  templates: string[];
  /** Preset bundle filenames under `presets/` plus any string entries declared on `theme.json.presets`. */
  presets: string[];
  /** Absolute path or CDN-prefixed URL for theme `assets/` (trailing slash omitted). */
  assetsBaseUrl: string;
}
