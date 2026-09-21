import { storageUrl } from "@/lib/apiBase";
import { ApiError, apiFetch, apiGet, apiPost } from "@/lib/apiClient";
import { getAuthSession } from "@/lib/authStorage";

export type WebsiteSectionOverride = {
  sectionKey: string;
  settings: Record<string, unknown>;
  orderIndex: number;
  enabled: boolean;
};

type TenantContentEnvelope = {
  success?: boolean;
  data?: {
    tenantId?: string;
    page?: string;
    sections?: unknown[];
  };
};

type TenantTokensEnvelope = {
  success?: boolean;
  data?: {
    tenantId?: string;
    tokens?: unknown;
  };
};

type TenantCurrentThemeEnvelope = {
  success?: boolean;
  data?: {
    tenantId?: string;
    theme?: {
      id?: string;
      slug?: string | null;
      themeName?: string;
      themeChannel?: string;
    } | null;
  } | null;
};

function coerceSections(input: unknown): WebsiteSectionOverride[] {
  if (!Array.isArray(input)) return [];
  const out: WebsiteSectionOverride[] = [];
  for (const row of input) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const sectionKey = typeof o.sectionKey === "string" ? o.sectionKey.trim() : "";
    if (!sectionKey) continue;
    out.push({
      sectionKey,
      settings:
        o.settings && typeof o.settings === "object" && !Array.isArray(o.settings)
          ? (o.settings as Record<string, unknown>)
          : {},
      orderIndex: typeof o.orderIndex === "number" ? o.orderIndex : out.length,
      enabled: o.enabled !== false,
    });
  }
  return out;
}

export async function fetchTenantContent(page: string): Promise<WebsiteSectionOverride[]> {
  const res = await apiGet<TenantContentEnvelope>(`/themes/tenant-content?page=${encodeURIComponent(page)}`);
  return coerceSections(res?.data?.sections);
}

export async function saveTenantContent(
  page: string,
  sections: WebsiteSectionOverride[],
): Promise<WebsiteSectionOverride[]> {
  const body = {
    page,
    sections: sections.map((s) => ({
      sectionKey: s.sectionKey,
      settings: s.settings,
      orderIndex: s.orderIndex,
      enabled: s.enabled,
    })),
  };
  const res = await apiPost<TenantContentEnvelope>("/themes/tenant-content", body);
  return coerceSections(res?.data?.sections);
}

export async function fetchTenantThemeTokens(): Promise<Record<string, unknown>> {
  const res = await apiGet<TenantTokensEnvelope>("/themes/tenant-theme-tokens");
  const t = res?.data?.tokens;
  return t && typeof t === "object" && !Array.isArray(t) ? (t as Record<string, unknown>) : {};
}

export async function saveTenantThemeTokens(tokens: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await apiPost<TenantTokensEnvelope>("/themes/tenant-theme-tokens", { tokens });
  const t = res?.data?.tokens;
  return t && typeof t === "object" && !Array.isArray(t) ? (t as Record<string, unknown>) : {};
}

export type SelectedThemeInfo = {
  id: string;
  slug: string | null;
  themeName: string;
  channel: string | null;
  webTheme: { id: string; slug: string | null; themeName: string; previewImage: string | null } | null;
  mobileTheme: { id: string; slug: string | null; themeName: string; previewImage: string | null } | null;
  comboId: string | null;
} | null;

export type StorefrontMobileThemeBundle = {
  base_layout: string;
  config: Record<string, unknown>;
  branding: {
    primary_color?: string;
    secondary_color?: string;
    logo?: string;
    tagline?: string;
  };
  preview?: {
    themeName?: string;
    slug?: string | null;
    assetBaseUrl?: string;
    languageCode?: string;
    locale?: Record<string, string>;
    homeTemplate?: Record<string, unknown> | null;
    tokens?: {
      colors?: Record<string, unknown>;
      typography?: Record<string, unknown>;
      layout?: Record<string, unknown>;
      spacing?: Record<string, unknown>;
    };
  } | null;
};

type StorefrontMobileThemeEnvelope = {
  success?: boolean;
  data?: StorefrontMobileThemeBundle;
};

export type WebsiteBuilderThemeInfo = {
  theme: string | null;
  theme_id: string | null;
  slug: string | null;
  version: string | null;
  manifest_version: string | null;
  storefront_key: string;
  manifest_path: string | null;
  allowed_sections: string[] | null;
  allowed_blocks: string[] | null;
  templates: Record<string, unknown>;
  component_schemas: Record<string, unknown>;
  asset_base_url: string | null;
  theme_engine: "registry-v1";
  compatibility: {
    engine: string;
    level: string;
    matrix_row: string;
    manifest_major: number | null;
    notes: string[];
  };
};

type WebsiteBuilderThemeInfoEnvelope = {
  success?: boolean;
  data?: WebsiteBuilderThemeInfo;
};

export async function fetchWebsiteBuilderThemeInfo(): Promise<WebsiteBuilderThemeInfo> {
  const res = await apiGet<WebsiteBuilderThemeInfoEnvelope>("/distributor/website-builder/theme-info");
  const d = res?.data;
  if (!d || typeof d !== "object") {
    throw new Error("Theme info response was empty.");
  }
  return d;
}

function absoluteThemeFileUrl(manifestPath: string, relativePath: string): string {
  const manifestUrl =
    import.meta.env.DEV && manifestPath.startsWith("/storage/")
      ? `${window.location.origin}${manifestPath}`
      : storageUrl(manifestPath);
  try {
    return new URL(relativePath.replace(/^\/+/u, ""), new URL(".", manifestUrl)).toString();
  } catch {
    const base = manifestUrl.replace(/\/[^/]*$/u, "");
    return `${base}/${relativePath.replace(/^\/+/u, "")}`;
  }
}

/**
 * Loads the selected theme template from the same public manifest used by the
 * storefront. This keeps the editor usable when an older theme row has no
 * pre-expanded template bundle in the authenticated theme-info response.
 */
export async function fetchWebsiteBuilderTemplate(
  info: WebsiteBuilderThemeInfo,
  page: "home" | "category" | "product",
): Promise<Record<string, unknown> | null> {
  const bundled = info.templates?.[page];
  if (bundled && typeof bundled === "object" && !Array.isArray(bundled)) {
    return bundled as Record<string, unknown>;
  }
  const manifestPath = info.manifest_path?.trim();
  if (!manifestPath) return null;
  const manifestUrl =
    import.meta.env.DEV && manifestPath.startsWith("/storage/")
      ? manifestPath
      : storageUrl(manifestPath);
  const manifestResponse = await fetch(manifestUrl, { cache: "no-store" });
  if (!manifestResponse.ok) {
    throw new Error(`Theme manifest could not be loaded (${manifestResponse.status}).`);
  }
  const manifest = (await manifestResponse.json()) as Record<string, unknown>;
  const refs =
    manifest.templates && typeof manifest.templates === "object" && !Array.isArray(manifest.templates)
      ? (manifest.templates as Record<string, unknown>)
      : {};
  const relativePath = typeof refs[page] === "string" ? refs[page].trim() : "";
  if (!relativePath) return null;
  const templateResponse = await fetch(absoluteThemeFileUrl(manifestPath, relativePath), { cache: "no-store" });
  if (!templateResponse.ok) {
    throw new Error(`Theme ${page} template could not be loaded (${templateResponse.status}).`);
  }
  const template = (await templateResponse.json()) as unknown;
  return template && typeof template === "object" && !Array.isArray(template)
    ? (template as Record<string, unknown>)
    : null;
}

export async function fetchStorefrontMobileThemeBundle(languageCode?: string): Promise<StorefrontMobileThemeBundle | null> {
  const tenantId = getAuthSession()?.tenantId ?? null;
  const headers = tenantId ? { "X-Tenant-Id": tenantId } : undefined;
  const language = languageCode?.trim().toLowerCase().split("-")[0] || "";
  const query = language ? `?language=${encodeURIComponent(language)}` : "";
  const res = await apiGet<StorefrontMobileThemeEnvelope>(`/storefront/theme${query}`, { headers, cache: "no-store" });
  return res?.data && typeof res.data === "object" ? res.data : null;
}

/** Normalize section keys for comparing manifest allow-list to editor registry keys. */
export function normalizeSectionCapabilityKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function allowedSectionKeysSet(allowed: string[] | null | undefined): Set<string> | null {
  if (!allowed?.length) return null;
  const out = new Set<string>();
  for (const x of allowed) {
    const k = normalizeSectionCapabilityKey(x);
    if (k) out.add(k);
  }
  return out.size ? out : null;
}

export async function fetchSelectedThemeInfo(): Promise<SelectedThemeInfo> {
  const res = await apiGet<TenantCurrentThemeEnvelope>("/themes/tenant/current");
  const data = res?.data as Record<string, unknown> | undefined;
  const t = data?.theme;
  if (!t || typeof t !== "object") return null;
  const theme = t as Record<string, unknown>;
  const id = typeof theme.id === "string" ? theme.id.trim() : "";
  if (!id) return null;
  const parseTheme = (raw: unknown) => {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const themeId = typeof o.id === "string" ? o.id.trim() : "";
    if (!themeId) return null;
    return {
      id: themeId,
      slug: typeof o.slug === "string" ? o.slug : null,
      themeName: typeof o.themeName === "string" && o.themeName.trim() ? o.themeName : "Theme",
      previewImage: typeof o.previewImage === "string" ? storageUrl(o.previewImage) : null,
    };
  };
  return {
    id,
    slug: typeof theme.slug === "string" ? theme.slug : null,
    themeName: typeof theme.themeName === "string" && theme.themeName.trim() ? theme.themeName : "Theme",
    channel: typeof theme.themeChannel === "string" ? theme.themeChannel : null,
    webTheme: parseTheme(data?.webTheme),
    mobileTheme: parseTheme(data?.mobileTheme),
    comboId: typeof data?.comboId === "string" ? data.comboId : null,
  };
}

type TenantMediaUploadEnvelope = {
  success?: boolean;
  data?: {
    url?: string;
    path?: string;
    fileName?: string;
  };
};

/** Adds a short DB hint when theme customization tables are missing. */
export function formatWebsiteBuilderError(e: unknown, fallback: string): string {
  const msg = e instanceof ApiError ? e.message : fallback;
  if (/tenant_sections|tenant_theme_tokens/u.test(msg)) {
    return `${msg} If tables are missing, from repo root run: cd backend && npm run migration:run`;
  }
  return msg;
}

/** Row from `GET /themes` (subset used by theme picker). */
export type ApiThemeRow = {
  id: string;
  themeName: string;
  slug: string | null;
  themeChannel?: string;
};

type ThemesListEnvelope = {
  success?: boolean;
  data?: ApiThemeRow[];
};

export type ThemeComboPackRow = {
  id: string;
  name: string;
  webThemeId: string;
  mobileThemeId: string;
  previewImage?: string | null;
  webTheme?: { themeName?: string; slug?: string | null; previewImage?: string | null };
  mobileTheme?: { themeName?: string; slug?: string | null; previewImage?: string | null };
};

/** `GET /distributor/themes` — snake_case rows (gallery). */
export type DistributorThemeGalleryRow = {
  id: string;
  theme_name: string;
  preview_image: string;
  base_layout: string;
  version?: string | null;
  theme_family?: string | null;
  storefront_key?: string | null;
};

type ComboListEnvelope = {
  success?: boolean;
  data?: ThemeComboPackRow[];
};

export type ThemeChangeEntry = {
  id: string;
  createdAt: string;
  changedByUserId: string | null;
  changedByEmail: string | null;
  previous: {
    webThemeId: string | null;
    webLabel: string | null;
    mobileThemeId: string | null;
    mobileLabel: string | null;
    comboId: string | null;
    comboName: string | null;
  };
  current: {
    webThemeId: string;
    webLabel: string | null;
    mobileThemeId: string | null;
    mobileLabel: string | null;
    comboId: string | null;
    comboName: string | null;
  };
};

type ThemeHistoryEnvelope = {
  success?: boolean;
  data?: { tenantId?: string; entries?: ThemeChangeEntry[] };
};

export async function fetchThemeCatalog(): Promise<{ webThemes: ApiThemeRow[]; combos: ThemeComboPackRow[] }> {
  const [themesRes, comboRes] = await Promise.all([
    apiGet<ThemesListEnvelope>("/themes"),
    apiGet<ComboListEnvelope>("/themes/combo-packs"),
  ]);
  const all = Array.isArray(themesRes?.data) ? themesRes.data : [];
  const webThemes = all.filter((t) => (t.themeChannel ?? "WEB") === "WEB");
  const combos = Array.isArray(comboRes?.data)
    ? (comboRes.data as ThemeComboPackRow[]).map((c) => ({
        ...c,
        previewImage: storageUrl(c.previewImage),
      }))
    : [];
  return { webThemes, combos };
}

export async function fetchThemeChangeHistory(): Promise<{ tenantId: string; entries: ThemeChangeEntry[] }> {
  const res = await apiGet<ThemeHistoryEnvelope>("/themes/tenant/theme-change-history");
  const d = res?.data;
  const tenantId = typeof d?.tenantId === "string" ? d.tenantId : "";
  const entries = Array.isArray(d?.entries) ? d.entries : [];
  return { tenantId, entries };
}

type DistributorThemesEnvelope = {
  success?: boolean;
  data?: DistributorThemeGalleryRow[];
};

/** `GET /distributor/themes?channel=WEB|MOBILE` — Level 1 image previews for the gallery. */
export async function fetchDistributorThemeGallery(
  channel: "WEB" | "MOBILE" = "WEB",
): Promise<DistributorThemeGalleryRow[]> {
  const res = await apiGet<DistributorThemesEnvelope>(
    `/distributor/themes?channel=${encodeURIComponent(channel)}`,
  );
  return Array.isArray(res?.data)
    ? res.data.map((row) => ({
        ...row,
        preview_image: storageUrl(row.preview_image),
      }))
    : [];
}

/** `POST /distributor/themes/select` — `theme_id` or `combo_id` (exactly one). */
export async function postDistributorThemeSelect(body: {
  theme_id?: string;
  combo_id?: string;
  tenant_id?: string;
}): Promise<unknown> {
  return apiPost("/distributor/themes/select", body);
}

export async function postSelectTheme(body: {
  themeId?: string;
  comboId?: string;
  webThemeId?: string;
  mobileThemeId?: string;
  tenantId?: string;
}): Promise<unknown> {
  return apiPost("/themes/select", body);
}

export async function uploadTenantMedia(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch<TenantMediaUploadEnvelope>("/themes/tenant-media/upload", {
    method: "POST",
    body: form,
  });
  const url = res?.data?.url;
  if (!url || typeof url !== "string") {
    throw new Error("Upload succeeded but image URL was missing.");
  }
  return url;
}
