import { apiGet } from "@/lib/apiClient";
import { storageUrl } from "@/lib/apiBase";

export type PublicTheme = {
  id: string;
  slug?: string | null;
  themeName: string;
  themeType: string;
  previewImage: string | null;
  previewImages?: string[];
  themeChannel?: string;
  status?: string;
  industryTags: string[];
};

export type PublicThemeCombo = {
  id: string;
  name: string;
  previewImage: string | null;
  webThemeId: string;
  mobileThemeId: string;
  webThemeName: string;
  mobileThemeName: string;
  industryTags: string[];
};

type ThemesListResponse = {
  success?: boolean;
  data?: unknown;
};

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap(collectStrings);
}

function themeIndustryTags(theme: Record<string, unknown> | null): string[] {
  if (!theme) return [];
  const config =
    theme.themeConfigJson && typeof theme.themeConfigJson === "object" && !Array.isArray(theme.themeConfigJson)
      ? (theme.themeConfigJson as Record<string, unknown>)
      : null;
  const manifest =
    config?.manifest && typeof config.manifest === "object" && !Array.isArray(config.manifest)
      ? (config.manifest as Record<string, unknown>)
      : null;
  return Array.from(
    new Set([
      ...collectStrings(theme.industry),
      ...collectStrings(theme.industries),
      ...collectStrings(config?.industry),
      ...collectStrings(config?.industries),
      ...collectStrings(manifest?.industry),
      ...collectStrings(manifest?.industries),
    ]),
  );
}

export async function fetchTenantThemes(): Promise<PublicTheme[]> {
  const res = await apiGet<ThemesListResponse>("/themes");
  const list = Array.isArray(res?.data) ? res.data : [];
  const out: PublicTheme[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    if (!id) continue;
    const channel = typeof o.themeChannel === "string" ? o.themeChannel.toUpperCase() : "WEB";
    const themeName = typeof o.themeName === "string" ? o.themeName : "Theme";
    const themeType = typeof o.themeType === "string" ? o.themeType : "";
    const previewImage = storageUrl(typeof o.previewImage === "string" ? o.previewImage : null) || null;
    const previewImages = Array.isArray(o.previewImages)
      ? o.previewImages
          .filter((x): x is string => typeof x === "string")
          .map((x) => storageUrl(x))
          .filter(Boolean)
      : undefined;
    out.push({
      id,
      slug: typeof o.slug === "string" ? o.slug : null,
      themeName,
      themeType,
      previewImage,
      previewImages,
      themeChannel: channel,
      status: typeof o.status === "string" ? o.status : undefined,
      industryTags: themeIndustryTags(o),
    });
  }
  return out;
}

export async function fetchThemeComboPacks(): Promise<PublicThemeCombo[]> {
  const res = await apiGet<ThemesListResponse>("/themes/combo-packs");
  const list = Array.isArray(res?.data) ? res.data : [];
  const out: PublicThemeCombo[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const webThemeId = typeof o.webThemeId === "string" ? o.webThemeId.trim() : "";
    const mobileThemeId = typeof o.mobileThemeId === "string" ? o.mobileThemeId.trim() : "";
    if (!id || !webThemeId || !mobileThemeId) continue;
    const webTheme =
      o.webTheme && typeof o.webTheme === "object" ? (o.webTheme as Record<string, unknown>) : null;
    const mobileTheme =
      o.mobileTheme && typeof o.mobileTheme === "object" ? (o.mobileTheme as Record<string, unknown>) : null;
    const comboPreview =
      storageUrl(typeof o.previewImage === "string" ? o.previewImage : null) ||
      storageUrl(typeof webTheme?.previewImage === "string" ? webTheme.previewImage : null) ||
      storageUrl(typeof mobileTheme?.previewImage === "string" ? mobileTheme.previewImage : null) ||
      null;
    out.push({
      id,
      name: typeof o.name === "string" ? o.name : "Theme combo",
      previewImage: comboPreview,
      webThemeId,
      mobileThemeId,
      webThemeName: typeof webTheme?.themeName === "string" ? webTheme.themeName : "Web theme",
      mobileThemeName: typeof mobileTheme?.themeName === "string" ? mobileTheme.themeName : "Mobile theme",
      industryTags: Array.from(
        new Set([...themeIndustryTags(webTheme), ...themeIndustryTags(mobileTheme)]),
      ),
    });
  }
  return out;
}
