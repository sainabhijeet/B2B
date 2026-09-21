import { apiGet } from "@/lib/apiClient";

export type PlatformLanguage = {
  name: string;
  code: string;
  direction: "ltr" | "rtl";
  status?: "active" | "disabled";
  isDefault: boolean;
};

const FALLBACK_LANGUAGES: PlatformLanguage[] = [
  { name: "English", code: "en", direction: "ltr", isDefault: true },
  { name: "Hindi", code: "hi", direction: "ltr", isDefault: false },
  { name: "French", code: "fr", direction: "ltr", isDefault: false },
];

export async function fetchPlatformLanguages(): Promise<PlatformLanguage[]> {
  try {
    const rows = await apiGet<PlatformLanguage[]>("/distributor/onboarding/languages");
    const active = rows.filter((row) => row.code.trim() && row.status !== "disabled");
    const byCode = new Map<string, PlatformLanguage>();
    for (const lang of [...FALLBACK_LANGUAGES, ...active]) {
      byCode.set(lang.code.trim().toLowerCase(), {
        ...lang,
        code: lang.code.trim().toLowerCase(),
      });
    }
    return [...byCode.values()];
  } catch {
    return FALLBACK_LANGUAGES;
  }
}
