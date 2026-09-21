import { apiGet, apiPost } from "@/lib/apiClient";

export type DistributorOnboardingStatus = {
  status: "in_progress" | "complete";
  currentStep: number;
  payload: Record<string, unknown>;
  completedAt: string | null;
};

export type StoreUrlPreview = {
  subdomain: string;
  platformDomain: string;
  productionHost: string;
  devPreviewUrl: string;
  message: string;
};

export type SubdomainAvailability = {
  normalized: string;
  available: boolean;
  suggestion?: string;
  reason?: "invalid" | "taken";
};

export async function fetchDistributorOnboardingStatus(): Promise<DistributorOnboardingStatus> {
  return apiGet<DistributorOnboardingStatus>("/distributor/onboarding/status");
}

export async function fetchStoreUrlPreview(brand?: string): Promise<StoreUrlPreview> {
  const q = brand?.trim() ? `?brand=${encodeURIComponent(brand.trim())}` : "";
  return apiGet<StoreUrlPreview>(`/distributor/onboarding/store-url-preview${q}`);
}

export async function fetchSubdomainAvailability(
  subdomain: string,
): Promise<SubdomainAvailability> {
  const q = `?subdomain=${encodeURIComponent(subdomain.trim())}`;
  return apiGet<SubdomainAvailability>(`/distributor/onboarding/subdomain-availability${q}`);
}

export async function saveDistributorOnboardingStep(body: {
  step: number;
  data: Record<string, unknown>;
}): Promise<DistributorOnboardingStatus> {
  return apiPost<DistributorOnboardingStatus>("/distributor/onboarding/save-step", body);
}

export async function completeDistributorOnboarding(): Promise<DistributorOnboardingStatus> {
  return apiPost<DistributorOnboardingStatus>("/distributor/onboarding/complete", {});
}
