import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/apiClient";

export type AttributeRow = {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  dataType: string;
  status: string;
};

export type AttributeValueRow = {
  id: string;
  attributeId: string;
  value: string;
  slug: string;
  status: string;
};

export type AttributesListResponse = {
  success: boolean;
  data: AttributeRow[];
  meta: { page: number; limit: number; total: number; total_pages: number };
  message: string;
};

export type AttributeValuesResponse = {
  success: boolean;
  data: AttributeValueRow[];
  meta: Record<string, unknown>;
  message: string;
};

/** Backend `AttributeQueryDto` caps `limit` at 100. */
const ATTRIBUTES_PAGE_SIZE = 100;

export function fetchAttributes(params?: { page?: number; limit?: number }): Promise<AttributesListResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params?.page ?? 1));
  const lim = params?.limit ?? ATTRIBUTES_PAGE_SIZE;
  q.set("limit", String(Math.min(Math.max(1, lim), ATTRIBUTES_PAGE_SIZE)));
  return apiGet<AttributesListResponse>(`/attributes?${q.toString()}`);
}

/** Loads all attribute rows (paged at 100 each) for wizards that need the full list. */
export async function fetchAttributesAll(maxPages = 50): Promise<AttributeRow[]> {
  const acc: AttributeRow[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await fetchAttributes({ page, limit: ATTRIBUTES_PAGE_SIZE });
    acc.push(...(res.data ?? []));
    const totalPages = res.meta?.total_pages ?? 1;
    if (page >= totalPages) break;
  }
  return acc;
}

export function fetchAttributeValues(attributeId: string): Promise<AttributeValuesResponse> {
  return apiGet<AttributeValuesResponse>(`/attributes/${attributeId}/values`);
}

/** Run async work over `items` with at most `concurrency` in flight (stable result order). */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const n = Math.max(1, Math.min(concurrency, items.length));
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await mapper(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export type CreateAttributeBody = {
  name: string;
  slug: string;
  dataType: string;
  status?: string;
};

export type UpdateAttributeBody = Partial<CreateAttributeBody>;

export type CreateAttributeValueBody = {
  value: string;
  slug: string;
  status?: string;
};

export type AttributeMutationResponse = {
  success: boolean;
  data: AttributeRow;
  meta: Record<string, unknown>;
  message: string;
};

export type AttributeValueMutationResponse = {
  success: boolean;
  data: AttributeValueRow;
  meta: Record<string, unknown>;
  message: string;
};

export function createAttribute(body: CreateAttributeBody): Promise<AttributeMutationResponse> {
  return apiPost<AttributeMutationResponse>("/attributes", body);
}

export function updateAttribute(id: string, body: UpdateAttributeBody): Promise<AttributeMutationResponse> {
  return apiPatch<AttributeMutationResponse>(`/attributes/${id}`, body);
}

export function deleteAttribute(id: string): Promise<{ success: boolean; data: { deleted: boolean }; message: string }> {
  return apiDelete(`/attributes/${id}`);
}

export function createAttributeValue(
  attributeId: string,
  body: CreateAttributeValueBody,
): Promise<AttributeValueMutationResponse> {
  return apiPost<AttributeValueMutationResponse>(`/attributes/${attributeId}/values`, body);
}
