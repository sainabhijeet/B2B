import { apiPost } from "@/lib/apiClient";

export type LogoGenerateResponse = {
  logos: string[];
  generations_used: number;
  generations_limit: number;
  generations_remaining: number;
  generation_source?: "openai" | "local";
};

export async function generateLogos(body: {
  business_name: string;
  industry: string;
  style?: string;
  color?: string;
  primary_hex?: string;
  secondary_hex?: string;
  tagline?: string;
}): Promise<LogoGenerateResponse> {
  return apiPost<LogoGenerateResponse>("/logo/generate", body);
}
