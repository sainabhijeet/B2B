import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import type {
  AddImageBody,
  CreateProductBody,
  CreateVariantBody,
  ProductDetailResponse,
  ProductMutationResponse,
  ProductsListResponse,
  UpdateProductBody,
  UpdateVariantBody,
  UpsertInventoryBody,
  VariantMutationResponse,
} from "@/types/product";

export function fetchProducts(params: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<ProductsListResponse> {
  const q = new URLSearchParams();
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.categoryId) q.set("categoryId", params.categoryId);
  if (params.status) q.set("status", params.status);
  if (params.minPrice != null) q.set("minPrice", String(params.minPrice));
  if (params.maxPrice != null) q.set("maxPrice", String(params.maxPrice));
  const qs = q.toString();
  return apiGet<ProductsListResponse>(`/products${qs ? `?${qs}` : ""}`);
}

export function fetchProduct(id: string): Promise<ProductDetailResponse> {
  return apiGet<ProductDetailResponse>(`/products/${id}`);
}

export function createProduct(body: CreateProductBody): Promise<ProductMutationResponse> {
  return apiPost<ProductMutationResponse>("/products", body);
}

export function updateProduct(id: string, body: UpdateProductBody): Promise<ProductMutationResponse> {
  return apiPatch<ProductMutationResponse>(`/products/${id}`, body);
}

export function deleteProduct(id: string): Promise<{ success: boolean }> {
  return apiDelete(`/products/${id}`);
}

export function createVariant(productId: string, body: CreateVariantBody): Promise<VariantMutationResponse> {
  return apiPost<VariantMutationResponse>(`/products/${productId}/variants`, body);
}

export function updateVariant(
  productId: string,
  variantId: string,
  body: UpdateVariantBody,
): Promise<VariantMutationResponse> {
  return apiPatch<VariantMutationResponse>(`/products/${productId}/variants/${variantId}`, body);
}

export function addProductImage(productId: string, body: AddImageBody): Promise<{ success: boolean }> {
  return apiPost(`/products/${productId}/images`, body);
}

export function upsertInventory(body: UpsertInventoryBody): Promise<{ success: boolean }> {
  return apiPost("/inventory", body);
}
