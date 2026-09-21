/** Dynamic keys from DB `theme_config_json.storefrontKey` / slug (e.g. jewellery, electronics, theme1, ...). */
export type StorefrontThemeKey = string;

export function normalizeStorefrontThemeKey(raw: string | null | undefined): StorefrontThemeKey {
  const k = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return k || "jewellery";
}
