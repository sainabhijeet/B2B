import { resolveStorefrontTheme } from "@/lib/resolve-storefront-theme";
import { headers } from "next/headers";

/** Resolves the tenant's persisted language for non-home storefront routes. */
export async function getStorefrontLanguage(): Promise<string> {
  const requestHeaders = await headers();
  const previewLanguage = requestHeaders.get("x-preview-language");
  const resolved = await resolveStorefrontTheme(null, previewLanguage
    ? { previewMode: true, previewLanguageCode: previewLanguage }
    : undefined);
  return resolved.selectedLanguageCode;
}
