import { cookies, headers } from "next/headers";
import { cache } from "react";
import { apiBaseUrl, backendOriginFromApiUrl } from "@/lib/api-origin";
import type { ThemeKey } from "@/lib/theme-config";
import { STOREFRONT_THEME_FALLBACK } from "@/lib/theme-config";
import { normalizeStorefrontThemeKey } from "@/lib/storefront-theme-keys";
import { resolveActiveLanguage } from "@/lib/language-consistency";
import type { TenantContentOverrides } from "@/engine/tenant-overrides";
import type { ThemePreviewState } from "@/lib/theme-preview-contract";
import { CUSTOMER_ACCESS_COOKIE } from "@/lib/customer-session-cookies";
import { tenantIdFromCustomerToken } from "@/lib/customer-token-tenant";

export type StorefrontBrandingPayload = {
  storeName: string | null;
  logoUrl: string | null;
  logoDataUrl: string | null;
  tagline: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  industryId: string | null;
  industryName: string | null;
};

export type ThemePreviewCatalog = {
  categories?: Array<Record<string, unknown>>;
  products?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export type CatalogPresentation = {
  mode: "DEMO" | "LIVE" | "UNKNOWN";
  hasDistributorProducts: boolean;
  notice: string | null;
};

const UNKNOWN_CATALOG_PRESENTATION: CatalogPresentation = {
  mode: "UNKNOWN",
  hasDistributorProducts: false,
  notice: null,
};

type CatalogPresentationPayload = {
  mode?: string;
  hasDistributorProducts?: boolean;
  notice?: string | null;
};

type ApiEnvelope = {
  success?: boolean;
  data?: {
    storefrontKey?: string;
    themeEngine?: string;
    contentOverrides?: TenantContentOverrides;
    tokenOverrides?: Record<string, unknown>;
    previewCatalog?: ThemePreviewCatalog | null;
    branding?: StorefrontBrandingPayload;
    webTheme?: {
      id: string;
      slug?: string | null;
      themeName?: string;
      previewImage?: string | null;
      manifestPath?: string | null;
    } | null;
    selectedLanguageCode?: string | null;
    catalogPresentation?: CatalogPresentationPayload | null;
  };
};

export type ResolvedStorefrontTheme = {
  storefrontKey: ThemeKey;
  /** Parsed `theme.json` from `/storage/.../theme.json` when available. */
  manifest: Record<string, unknown> | null;
  contentOverrides?: TenantContentOverrides | null;
  tokenOverrides?: Record<string, unknown> | null;
  previewCatalog?: ThemePreviewCatalog | null;
  branding?: StorefrontBrandingPayload | null;
  webTheme: {
    id: string;
    slug?: string | null;
    themeName?: string;
    previewImage?: string | null;
    manifestPath?: string | null;
  } | null;
  selectedLanguageCode: string;
  catalogPresentation: CatalogPresentation;
};

function normalizeCatalogPresentation(
  value: CatalogPresentationPayload | null | undefined,
): CatalogPresentation {
  if (!value || typeof value !== "object") return UNKNOWN_CATALOG_PRESENTATION;
  const mode = value.mode === "DEMO" || value.mode === "LIVE" ? value.mode : "UNKNOWN";
  return {
    mode,
    hasDistributorProducts: value.hasDistributorProducts === true,
    notice: typeof value.notice === "string" && value.notice.trim() ? value.notice.trim() : null,
  };
}

export function isDemoCatalog(resolved: ResolvedStorefrontTheme): boolean {
  return resolved.catalogPresentation.mode === "DEMO" && Boolean(resolved.previewCatalog);
}

/** Tenant/store identity wins over the installed theme's marketplace name. */
export function storefrontDisplayName(resolved: ResolvedStorefrontTheme): string {
  return (
    resolved.branding?.storeName?.trim() ||
    resolved.branding?.industryName?.trim() ||
    resolved.webTheme?.themeName?.trim() ||
    "Storefront"
  );
}

export type StorefrontThemeResolveOptions = {
  tenantId?: string | null;
  tenantSlug?: string | null;
  previewMode?: boolean;
  previewLanguageCode?: string | null;
  previewTokenOverrides?: Record<string, unknown> | null;
  previewState?: ThemePreviewState | null;
};

function allowThemeQueryOverride(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_THEME_QUERY === "1" ||
    process.env.NEXT_PUBLIC_THEME_QUERY === "true"
  );
}

export function allowPreviewQuery(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_THEME_PREVIEW_ENABLED === "1" || process.env.NEXT_PUBLIC_THEME_PREVIEW_ENABLED === "true";
}

function publicAssetUrl(raw: string | null | undefined): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  if (s.startsWith("/storage/") || s.startsWith("storage/") || s.startsWith("/api/")) {
    const origin = backendOriginFromApiUrl();
    const path = s.startsWith("/") ? s : `/${s}`;
    return `${origin}${path}`;
  }
  return s;
}

function publicPreviewCatalogAssets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(publicPreviewCatalogAssets);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, publicPreviewCatalogAssets(child)]),
    );
  }
  if (typeof value === "string" && (value.startsWith("/storage/") || value.startsWith("storage/"))) {
    return publicAssetUrl(value);
  }
  return value;
}

/**
 * Full resolution: DB-driven storefront key + optional `theme.json` manifest (runtime metadata).
 * Tenant comes from API middleware (`X-Storefront-Host` / host).
 *
 * `previewThemeKey` (e.g. from `?theme=textile`) works in dev or when `NEXT_PUBLIC_THEME_QUERY=1`.
 */
async function resolveStorefrontThemeUncached(
  previewThemeKey?: string | null,
  options: StorefrontThemeResolveOptions = {},
): Promise<ResolvedStorefrontTheme> {
  const previewEnabled = options.previewMode === true && allowPreviewQuery();
  const requestedPreviewLanguage =
    options.previewState?.languageContract?.languageCode ||
    options.previewState?.languageCode ||
    options.previewLanguageCode;
  const fallbackLanguage = requestedPreviewLanguage ? resolveActiveLanguage(requestedPreviewLanguage) : "en";
  if (previewThemeKey && (allowThemeQueryOverride() || previewEnabled)) {
    return {
      storefrontKey: normalizeStorefrontThemeKey(previewThemeKey),
      manifest: null,
      contentOverrides: null,
      tokenOverrides: null,
      branding: null,
      webTheme: null,
      selectedLanguageCode: previewEnabled ? fallbackLanguage : "en",
      catalogPresentation: UNKNOWN_CATALOG_PRESENTATION,
    };
  }

  const base = apiBaseUrl();

  const [h, cookieStore] = await Promise.all([headers(), cookies()]);
  /** Prefer forwarded host (proxies); else Host — sent as `X-Storefront-Host` so API resolves `{subdomain}.localhost` → tenant. */
  const browserHost =
    h.get("x-forwarded-host") ?? h.get("x-vercel-forwarded-host") ?? h.get("host") ?? "";
  const tenantIdCandidate =
    options.tenantId?.trim() || h.get("x-storefront-tenant-id")?.trim() || cookieStore.get("storefront_tenant_id")?.value.trim();
  const selectedTenantId = tenantIdCandidate && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(tenantIdCandidate)
    ? tenantIdCandidate
    : null;
  const previewTenantSlug =
    options.tenantSlug?.trim() || h.get("x-storefront-tenant")?.trim() || cookieStore.get("storefront_tenant")?.value.trim();
  const previewTenantId = selectedTenantId || (!previewTenantSlug
    ? tenantIdFromCustomerToken(cookieStore.get(CUSTOMER_ACCESS_COOKIE)?.value)
    : null);
  const storefrontHost = previewTenantSlug ? `${previewTenantSlug}.localhost` : browserHost;

  try {
    const previewQuery = previewEnabled
      ? `/themes/storefront/preview?language=${encodeURIComponent(fallbackLanguage)}`
      : "/themes/storefront/current";
    const tenantHeaders: Record<string, string> = previewTenantId
      ? { "x-tenant-id": previewTenantId }
      : storefrontHost
        ? { "x-storefront-host": storefrontHost }
        : {};
    const [res, configRes] = await Promise.all([
      fetch(`${base}${previewQuery}`, { cache: "no-store", headers: tenantHeaders }),
      previewEnabled
        ? Promise.resolve(null)
        : fetch(`${base}/storefront/app-config`, { cache: "no-store", headers: tenantHeaders }).catch(() => null),
    ]);
    if (!res.ok) {
      return {
        storefrontKey: STOREFRONT_THEME_FALLBACK,
        manifest: null,
        contentOverrides: null,
        tokenOverrides: null,
        branding: null,
        webTheme: null,
        selectedLanguageCode: fallbackLanguage,
        catalogPresentation: UNKNOWN_CATALOG_PRESENTATION,
      };
    }
    const body = (await res.json()) as ApiEnvelope;
    const data = body?.data;
    const configBody = configRes?.ok
      ? await configRes.json().catch(() => null) as ApiEnvelope | null
      : null;
    const catalogPresentation = previewEnabled
      ? UNKNOWN_CATALOG_PRESENTATION
      : normalizeCatalogPresentation(configBody?.data?.catalogPresentation);
    const storefrontKey = normalizeStorefrontThemeKey(data?.storefrontKey);
    const webTheme = data?.webTheme
      ? {
          ...data.webTheme,
          previewImage: publicAssetUrl(data.webTheme.previewImage),
        }
      : null;
    const contentOverrides = data?.contentOverrides ?? null;
    let previewCatalog = previewEnabled && data?.previewCatalog
      ? publicPreviewCatalogAssets(data.previewCatalog) as ThemePreviewCatalog
      : null;
    if (!previewEnabled && catalogPresentation.mode === "DEMO") {
      try {
        const demoRes = await fetch(`${base}/themes/storefront/preview?language=${encodeURIComponent(fallbackLanguage)}`, {
          cache: "no-store",
          headers: tenantHeaders,
        });
        if (demoRes.ok) {
          const demoBody = await demoRes.json() as ApiEnvelope;
          previewCatalog = demoBody.data?.previewCatalog
            ? publicPreviewCatalogAssets(demoBody.data.previewCatalog) as ThemePreviewCatalog
            : null;
        }
      } catch {
        previewCatalog = null;
      }
    }
    const tokenOverrides = previewEnabled
      ? { ...(data?.tokenOverrides ?? {}), ...(options.previewTokenOverrides ?? {}), ...(options.previewState?.tokenOverrides ?? {}) }
      : data?.tokenOverrides ?? null;
    const branding = data?.branding
      ? {
          ...data.branding,
          logoUrl: publicAssetUrl(data.branding.logoUrl),
        }
      : null;
    const selectedLanguageCode = previewEnabled && requestedPreviewLanguage
      ? fallbackLanguage
      : typeof data?.selectedLanguageCode === "string" && data.selectedLanguageCode.trim()
      ? resolveActiveLanguage(data.selectedLanguageCode)
      : fallbackLanguage;
    const manifestPath = webTheme?.manifestPath;

    let manifest: Record<string, unknown> | null = null;
    if (typeof manifestPath === "string" && manifestPath.length > 0) {
      const origin = backendOriginFromApiUrl();
      const manifestUrl = /^https?:\/\//i.test(manifestPath)
        ? manifestPath
        : `${origin}${manifestPath.startsWith("/") ? "" : "/"}${manifestPath}`;
      try {
        // Admin theme revisions can replace a package at the same storage URL.
        // Read the active manifest so newly activated templates appear at once.
        const mRes = await fetch(manifestUrl, { cache: "no-store" });
        if (mRes.ok) {
          manifest = (await mRes.json()) as Record<string, unknown>;
        }
      } catch {
        manifest = null;
      }
    }

    return { storefrontKey, manifest, contentOverrides, tokenOverrides, previewCatalog, branding, webTheme, selectedLanguageCode, catalogPresentation };
  } catch {
    return {
      storefrontKey: STOREFRONT_THEME_FALLBACK,
      manifest: null,
      contentOverrides: null,
      tokenOverrides: null,
      branding: null,
      webTheme: null,
      selectedLanguageCode: fallbackLanguage,
      catalogPresentation: UNKNOWN_CATALOG_PRESENTATION,
    };
  }
}

// Layout, metadata and the page can all ask for the same tenant theme during a
// single React server render. De-duplicate that shared work without caching it
// across users or tenant requests.
const resolveDefaultStorefrontTheme = cache(() =>
  resolveStorefrontThemeUncached(null, {}),
);

export async function resolveStorefrontTheme(
  previewThemeKey?: string | null,
  options?: StorefrontThemeResolveOptions,
): Promise<ResolvedStorefrontTheme> {
  if (!previewThemeKey && options === undefined) {
    return resolveDefaultStorefrontTheme();
  }
  return resolveStorefrontThemeUncached(previewThemeKey, options ?? {});
}

/**
 * Theme key only (backward compatible with older call sites).
 */
export async function resolveStorefrontThemeKey(): Promise<ThemeKey> {
  const r = await resolveStorefrontTheme();
  return r.storefrontKey;
}
