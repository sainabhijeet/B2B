import { apiGet } from "@/lib/apiClient";

export type CheckPackageResponse = {
  available: boolean;
  normalized: string;
  reason?: "invalid_format" | "taken_platform" | "taken_play_store";
  playStoreChecked: boolean;
  playStoreListingFound?: boolean;
};

export async function fetchCheckPackage(packageId: string): Promise<CheckPackageResponse> {
  const q = `?package=${encodeURIComponent(packageId.trim())}`;
  return apiGet<CheckPackageResponse>(`/app/check-package${q}`);
}
