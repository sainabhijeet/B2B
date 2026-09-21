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
