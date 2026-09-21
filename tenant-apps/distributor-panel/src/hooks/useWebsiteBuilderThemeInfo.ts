import { useQuery } from "@tanstack/react-query";
import { fetchWebsiteBuilderThemeInfo, type WebsiteBuilderThemeInfo } from "@/lib/websiteBuilderApi";

export function useWebsiteBuilderThemeInfo() {
  return useQuery({
    queryKey: ["website-builder", "theme-info"],
    queryFn: fetchWebsiteBuilderThemeInfo,
    staleTime: 5 * 60 * 1000,
  });
}

/** Alias aligned with builder roadmap naming. */
export const useThemeInfo = useWebsiteBuilderThemeInfo;

export type { WebsiteBuilderThemeInfo };
