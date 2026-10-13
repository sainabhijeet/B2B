import { apiGet, apiPost } from "@/lib/apiClient";

export type BrandPalette = {
  primary: string;
  secondary: string;
  label?: string;
};

export type BrandingAiLimits = {
  colorPalettes: number;
  taglineSuggestions: number;
  logoGenerationLimit: number;
  maxLogoBatchesPerTenant: number;
};

export async function fetchBrandingAiLimits(): Promise<BrandingAiLimits> {
  return apiGet<BrandingAiLimits>("/branding/ai-limits");
}

export async function extractBrandingColors(body: {
  image_data_url: string;
}): Promise<{ primary: string; secondary: string }> {
  return apiPost<{ primary: string; secondary: string }>("/branding/extract-colors", body);
}

export async function suggestPalettes(body: {
  business_name: string;
  industry: string;
  style?: string;
  count?: number;
}): Promise<{ palettes: BrandPalette[] }> {
  return apiPost<{ palettes: BrandPalette[] }>("/branding/suggest-palettes", body);
}

export async function suggestTaglines(body: {
  business_name: string;
  industry: string;
  style?: string;
  primary_hex?: string;
  secondary_hex?: string;
}): Promise<{ taglines: string[]; font_hint: string | null }> {
  return apiPost<{ taglines: string[]; font_hint: string | null }>(
    "/branding/suggest-taglines",
    body,
  );
}
