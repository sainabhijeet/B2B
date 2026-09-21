import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/apiClient';

export type CatalogEnvelope<T> = {
  success: boolean;
  data: T;
  meta?: { page?: number; limit?: number; total?: number; total_pages?: number };
  message?: string;
};

export type CatalogCategory = {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  parentId: string | null;
  industryId: string | null;
  level: number;
  status: 'active' | 'inactive' | 'archived';
  description: string;
  sortOrder: number;
  iconUrl: string | null;
  bannerUrl: string | null;
  thumbnailUrl: string | null;
  showInApp: boolean;
  showInWebsite: boolean;
  showInMenu: boolean;
  attributeIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CategoryInput = Pick<
  CatalogCategory,
  | 'name'
  | 'slug'
  | 'status'
  | 'description'
  | 'sortOrder'
  | 'showInApp'
  | 'showInWebsite'
  | 'showInMenu'
  | 'attributeIds'
> & {
  tenantId?: string;
  parentId?: string;
  industryId?: string;
  iconUrl?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
};

export async function fetchCategories(input: {
  tenantId?: string;
  globalOnly?: boolean;
  includeGlobal?: boolean;
  page?: number;
  limit?: number;
}): Promise<CatalogEnvelope<CatalogCategory[]>> {
  const q = new URLSearchParams({ page: String(input.page ?? 1), limit: String(input.limit ?? 100) });
  if (input.globalOnly) q.set('scope', 'global');
  if (input.tenantId) q.set('tenantId', input.tenantId);
  if (input.includeGlobal) q.set('includeGlobal', 'true');
  return apiGet(`/categories?${q.toString()}`);
}

export function fetchCategory(id: string): Promise<CatalogEnvelope<CatalogCategory>> {
  return apiGet(`/categories/${encodeURIComponent(id)}`);
}

export function createCategory(input: CategoryInput): Promise<CatalogEnvelope<CatalogCategory>> {
  return apiPost('/categories', input);
}

export function updateCategory(id: string, input: Partial<CategoryInput>): Promise<CatalogEnvelope<CatalogCategory>> {
  return apiPatch(`/categories/${encodeURIComponent(id)}`, input);
}

export function deleteCategory(id: string): Promise<CatalogEnvelope<{ deleted: boolean }>> {
  return apiDelete(`/categories/${encodeURIComponent(id)}`);
}

export type CatalogProduct = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  price: string;
  mrp: string;
  taxRate: string;
  status: string;
  brand: string | null;
  costPrice: string | null;
  tags: string[];
  thumbnailUrl?: string | null;
  totalStock?: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductVariant = {
  id: string;
  variantSku: string;
  price: string;
  mrp: string;
  stockQuantity: number;
  attributesJson: Record<string, unknown>;
  status: string;
  moq: number;
  gstRate: string | null;
};

export type ProductImage = { id: string; imageUrl: string; isThumbnail: boolean; position: number };
export type ProductInventory = { id: string; variantId: string | null; stockQuantity: number; lowStockThreshold: number };
export type ProductDetail = {
  product: CatalogProduct;
  variants: ProductVariant[];
  images: ProductImage[];
  inventory: ProductInventory[];
};

export type ProductInput = {
  tenantId?: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  price: string;
  mrp: string;
  taxRate: string;
  status?: string;
  brand?: string;
  costPrice?: string;
  tags?: string[];
};

export function fetchProducts(input: {
  tenantId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<CatalogEnvelope<CatalogProduct[]>> {
  const q = new URLSearchParams({ tenantId: input.tenantId, page: String(input.page ?? 1), limit: String(input.limit ?? 20) });
  if (input.search?.trim()) q.set('search', input.search.trim());
  if (input.status) q.set('status', input.status);
  return apiGet(`/products?${q.toString()}`);
}

export function fetchProduct(id: string): Promise<CatalogEnvelope<ProductDetail>> {
  return apiGet(`/products/${encodeURIComponent(id)}`);
}

export function createProduct(input: ProductInput): Promise<CatalogEnvelope<CatalogProduct>> {
  return apiPost('/products', input);
}

export function updateProduct(id: string, input: Partial<ProductInput>): Promise<CatalogEnvelope<CatalogProduct>> {
  const { tenantId: _tenantId, ...body } = input;
  return apiPatch(`/products/${encodeURIComponent(id)}`, body);
}

export function deleteProduct(id: string): Promise<CatalogEnvelope<{ deleted: boolean }>> {
  return apiDelete(`/products/${encodeURIComponent(id)}`);
}

export function createProductVariant(productId: string, input: Omit<ProductVariant, 'id'>) {
  return apiPost<CatalogEnvelope<ProductVariant>>(`/products/${encodeURIComponent(productId)}/variants`, input);
}

export function updateProductVariant(productId: string, variantId: string, input: Partial<Omit<ProductVariant, 'id'>>) {
  return apiPatch<CatalogEnvelope<ProductVariant>>(`/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}`, input);
}

export function addProductImage(productId: string, imageUrl: string, position: number, isThumbnail: boolean) {
  return apiPost(`/products/${encodeURIComponent(productId)}/images`, { imageUrl, position, isThumbnail });
}

export function upsertProductInventory(productId: string, variantId: string | null, stockQuantity: number, lowStockThreshold: number) {
  return apiPost('/inventory', { productId, variantId, stockQuantity, lowStockThreshold });
}
