import { apiGet } from '@/lib/apiClient';

export type CatalogAttributeApiRow = {
  id: string;
  tenantId?: string | null;
  name: string;
  slug: string;
  dataType: string;
  status: string;
  createdAt?: string;
  catalogIndustries?: string[];
  catalogCategories?: string[];
};

type AttributesListEnvelope = {
  success?: boolean;
  data?: CatalogAttributeApiRow[];
  meta?: { page?: number; limit?: number; total?: number; total_pages?: number };
};

export async function listAttributesWithMappings(options?: { tenantId?: string; globalOnly?: boolean }): Promise<CatalogAttributeApiRow[]> {
  const rows: CatalogAttributeApiRow[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const q = new URLSearchParams({ page: String(page), limit: '100', include: 'mappings' });
    const body = await apiGet<AttributesListEnvelope>(`/attributes?${q.toString()}`);
    rows.push(...(body.data ?? []));
    if (page >= (body.meta?.total_pages ?? 1)) break;
  }
  if (options?.globalOnly) return rows.filter((row) => row.tenantId == null);
  if (options?.tenantId) return rows.filter((row) => row.tenantId == null || row.tenantId === options.tenantId);
  return rows;
}
