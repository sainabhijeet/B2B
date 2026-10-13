import { cookies, headers } from "next/headers";
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

type ApiEnvelope = {
  success?: boolean;
  data?: {
    storefrontKey?: string;
    themeEngine?: string;
    contentOverrides?: TenantContentOverrides;
    tokenOverrides?: Record<string, unknown>;
    branding?: StorefrontBrandingPayload;
    webTheme?: {
      id: string;
      slug?: string | null;
      themeName?: string;
      previewImage?: string | null;
      manifestPath?: string | null;
    } | null;
    selectedLanguageCode?: string | null;
  };
};

export type ResolvedStorefrontTheme = {
  storefrontKey: ThemeKey;
  /** Parsed `theme.json` from `/storage/.../theme.json` when available. */
  manifest: Record<string, unknown> | null;
  contentOverrides?: TenantContentOverrides | null;
  tokenOverrides?: Record<string, unknown> | null;
  branding?: StorefrontBrandingPayload | null;
  webTheme: {
    id: string;
    slug?: string | null;
    themeName?: string;
    previewImage?: string | null;
    manifestPath?: string | null;
  } | null;
  selectedLanguageCode: string;
};

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

function allowPreviewQuery(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_THEME_PREVIEW_ENABLED === "1" || process.env.NEXT_PUBLIC_THEME_PREVIEW_ENABLED === "true";
}

function publicAssetUrl(raw: string | null | undefined): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:")) return s;
  if (s.startsWith("/storage/") || s.startsWith("storage/")) {
    const origin = backendOriginFromApiUrl();
    const path = s.startsWith("/") ? s : `/${s}`;
    return `${origin}${path}`;
  }
  return s;
}

/**
 * Full resolution: DB-driven storefront key + optional `theme.json` manifest (runtime metadata).
 * Tenant comes from API middleware (`X-Storefront-Host` / host).
 *
 * `previewThemeKey` (e.g. from `?theme=textile`) works in dev or when `NEXT_PUBLIC_THEME_QUERY=1`.
 */
export async function resolveStorefrontTheme(
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
    const res = await fetch(`${base}/themes/storefront/current`, {
      cache: "no-store",
      headers: previewTenantId
        ? { "x-tenant-id": previewTenantId }
        : storefrontHost
          ? { "x-storefront-host": storefrontHost }
          : {},
    });
    if (!res.ok) {
      return {
        storefrontKey: STOREFRONT_THEME_FALLBACK,
        manifest: null,
        contentOverrides: null,
        tokenOverrides: null,
        branding: null,
        webTheme: null,
        selectedLanguageCode: fallbackLanguage,
      };
    }
    const body = (await res.json()) as ApiEnvelope;
    const data = body?.data;
    const storefrontKey = normalizeStorefrontThemeKey(data?.storefrontKey);
    const webTheme = data?.webTheme
      ? {
          ...data.webTheme,
          previewImage: publicAssetUrl(data.webTheme.previewImage),
        }
      : null;
    const contentOverrides = data?.contentOverrides ?? null;
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
        const mRes = await fetch(manifestUrl, { cache: "no-store" });
        if (mRes.ok) {
          manifest = (await mRes.json()) as Record<string, unknown>;
        }
      } catch {
        manifest = null;
      }
    }

    return { storefrontKey, manifest, contentOverrides, tokenOverrides, branding, webTheme, selectedLanguageCode };
  } catch {
    return {
      storefrontKey: STOREFRONT_THEME_FALLBACK,
      manifest: null,
      contentOverrides: null,
      tokenOverrides: null,
      branding: null,
      webTheme: null,
      selectedLanguageCode: fallbackLanguage,
    };
  }
}

/**
 * Theme key only (backward compatible with older call sites).
 */
export async function resolveStorefrontThemeKey(): Promise<ThemeKey> {
  const r = await resolveStorefrontTheme();
  return r.storefrontKey;
}
