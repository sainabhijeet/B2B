import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/apiClient";

export type MergedBrandOption = {
  id: string;
  type: "master" | "tenant";
  name: string;
  slug: string;
  logoUrl: string | null;
  status?: string;
  description?: string | null;
};

export type MergedBrandsResponse = {
  success: boolean;
  data: MergedBrandOption[];
  message: string;
};

export function fetchBrandOptions(): Promise<MergedBrandsResponse> {
  return apiGet<MergedBrandsResponse>("/brands/options");
}

/** Catalog page: platform + your brands, including inactive custom rows. */
export function fetchBrandsCatalog(): Promise<MergedBrandsResponse> {
  return apiGet<MergedBrandsResponse>("/brands?includeInactive=1");
}

export type CreateTenantBrandBody = {
  name: string;
  slug?: string;
  logoUrl?: string;
  description?: string;
  status?: "active" | "inactive";
};

export type CreateTenantBrandResponse = {
  success: boolean;
  data: { id: string; name: string; slug: string };
  message: string;
};

export function createTenantBrand(body: CreateTenantBrandBody): Promise<CreateTenantBrandResponse> {
  return apiPost<CreateTenantBrandResponse>("/brands", body);
}

export type UpdateTenantBrandBody = {
  name?: string;
  slug?: string;
  /** Empty string clears the stored URL. */
  logoUrl?: string;
  /** Empty string clears the description. */
  description?: string;
  status?: "active" | "inactive";
};

export type TenantBrandMutationResponse = {
  success: boolean;
  data: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    description: string | null;
    status: string;
    masterBrandId: string | null;
  };
  message: string;
};

export function updateTenantBrand(
  id: string,
  body: UpdateTenantBrandBody,
): Promise<TenantBrandMutationResponse> {
  return apiPatch<TenantBrandMutationResponse>(`/brands/${id}`, body);
}

export function deleteTenantBrand(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return apiDelete<{ success: boolean; message: string }>(`/brands/${id}`);
}
