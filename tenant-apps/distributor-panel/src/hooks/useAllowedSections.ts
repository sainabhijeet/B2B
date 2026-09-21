import { allowedSectionKeysSet } from "@/lib/websiteBuilderApi";
import { useWebsiteBuilderThemeInfo } from "./useWebsiteBuilderThemeInfo";

/**
 * Section type keys from the active theme manifest (`allowed_sections` + `capabilities`).
 * `null` while loading, on error, or when the manifest omits a list → no filtering (legacy themes).
 */
export function useAllowedSections(): string[] | null {
  const q = useWebsiteBuilderThemeInfo();
  if (q.isPending || q.isError) return null;
  return q.data?.allowed_sections ?? null;
}

export function useAllowedSectionKeysSet(): Set<string> | null {
  return allowedSectionKeysSet(useAllowedSections() ?? undefined);
}
