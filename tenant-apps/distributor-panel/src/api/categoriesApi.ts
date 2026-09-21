import { apiGet } from "@/lib/apiClient";
import type { CategoriesListResponse, CategoryRow } from "@/types/category";

/** Backend `CategoryQueryDto` caps `limit` at 200 — stay within that. */
const CATEGORIES_PAGE_SIZE = 200;

export function fetchCategories(params?: { page?: number; limit?: number }): Promise<CategoriesListResponse> {
  const q = new URLSearchParams();
  q.set("page", String(params?.page ?? 1));
  const lim = params?.limit ?? 100;
  q.set("limit", String(Math.min(Math.max(1, lim), CATEGORIES_PAGE_SIZE)));
  return apiGet<CategoriesListResponse>(`/categories?${q.toString()}`);
}

/** Fetches every page until `total_pages` (wizard / pickers need full tree). */
export async function fetchCategoriesAll(maxPages = 50): Promise<CategoryRow[]> {
  const acc: CategoryRow[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await fetchCategories({ page, limit: CATEGORIES_PAGE_SIZE });
    acc.push(...(res.data ?? []));
    const totalPages = res.meta?.total_pages ?? 1;
    if (page >= totalPages) break;
  }
  return acc;
}
