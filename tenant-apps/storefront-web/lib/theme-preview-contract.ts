export type ThemePreviewLanguageContract = {
  languageCode: string;
  locale: string;
  direction: "ltr" | "rtl";
  revision: number;
  source: "tenant_app_settings.selected_language_code";
};

export type ThemePreviewState = {
  languageCode?: string;
  languageContract?: ThemePreviewLanguageContract;
  page?: "home" | "category" | "product";
  tokenOverrides?: Record<string, string>;
};

export const THEME_PREVIEW_STATE_PARAM = "previewState";
export const THEME_PREVIEW_MESSAGE = "theme-editor-state";
export const THEME_PREVIEW_READY_MESSAGE = "theme-editor-ready";
export const THEME_PREVIEW_LANGUAGE_SYNC_MESSAGE = "theme-language-sync";

const RTL_LANGUAGES = new Set(["ar", "ur"]);

export function previewLanguageContract(
  languageCode: string | null | undefined,
  revision = 0,
): ThemePreviewLanguageContract {
  const normalized = String(languageCode ?? "en").trim().toLowerCase().replace("_", "-").split("-")[0] || "en";
  return {
    languageCode: normalized,
    locale: normalized === "en" ? "en-IN" : normalized,
    direction: RTL_LANGUAGES.has(normalized) ? "rtl" : "ltr",
    revision,
    source: "tenant_app_settings.selected_language_code",
  };
}

export function encodeThemePreviewState(state: ThemePreviewState): string {
  return encodeURIComponent(JSON.stringify(state));
}

export function decodeThemePreviewState(raw: string | null | undefined): ThemePreviewState {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const value = parsed as Record<string, unknown>;
    const tokenOverrides = value.tokenOverrides;
    const languageContract = value.languageContract;
    const contract =
      languageContract && typeof languageContract === "object" && !Array.isArray(languageContract)
        ? languageContract as Record<string, unknown>
        : null;
    return {
      languageCode: typeof value.languageCode === "string" ? value.languageCode : undefined,
      languageContract: contract && typeof contract.languageCode === "string"
        ? {
            languageCode: contract.languageCode,
            locale: typeof contract.locale === "string" ? contract.locale : previewLanguageContract(contract.languageCode).locale,
            direction: contract.direction === "rtl" ? "rtl" : "ltr",
            revision: typeof contract.revision === "number" ? contract.revision : 0,
            source: "tenant_app_settings.selected_language_code",
          }
        : undefined,
      page: value.page === "home" || value.page === "category" || value.page === "product" ? value.page : undefined,
      tokenOverrides:
        tokenOverrides && typeof tokenOverrides === "object" && !Array.isArray(tokenOverrides)
          ? Object.fromEntries(Object.entries(tokenOverrides).filter(([, item]) => typeof item === "string")) as Record<string, string>
          : undefined,
    };
  } catch {
    return {};
  }
}
