import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/apiClient';

export type MasterBrandRow = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  industryId: string | null;
  industryName: string | null;
  status: string;
  createdAt: string;
};

type Envelope<T> = { success: boolean; data: T };

export async function listMasterBrands(params?: { search?: string; status?: string }): Promise<MasterBrandRow[]> {
  const q = new URLSearchParams();
  if (params?.search?.trim()) q.set('search', params.search.trim());
  if (params?.status) q.set('status', params.status);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  const body = await apiGet<Envelope<MasterBrandRow[]>>(`/master-brands${suffix}`);
  return Array.isArray(body.data) ? body.data : [];
}

export async function getMasterBrand(id: string): Promise<MasterBrandRow> {
  const body = await apiGet<Envelope<MasterBrandRow>>(`/master-brands/${id}`);
  return body.data;
}

export async function createMasterBrand(payload: {
  name: string;
  slug?: string;
  logoUrl?: string | null;
  industryId?: string | null;
  status?: string;
}): Promise<MasterBrandRow> {
  const body = await apiPost<Envelope<MasterBrandRow>>('/master-brands', payload);
  return body.data;
}

export async function updateMasterBrand(
  id: string,
  payload: Partial<{
    name: string;
    slug: string;
    logoUrl: string | null;
    industryId: string | null;
    status: string;
  }>,
): Promise<MasterBrandRow> {
  const body = await apiPatch<Envelope<MasterBrandRow>>(`/master-brands/${id}`, payload);
  return body.data;
}

export async function deleteMasterBrand(id: string): Promise<void> {
  await apiDelete(`/master-brands/${id}`);
}
