/** Mirrors `Product` entity fields returned by `GET /products` (plus list enrichments). */
export type ProductBrandSlot =
  | { kind: "none"; legacyName?: string | null }
  | { kind: "master"; masterBrandId: string; brandId: string }
  | { kind: "tenant"; brandId: string };

export type ProductRow = {
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
  brandId?: string | null;
  brand?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  costPrice?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  thumbnailUrl?: string | null;
  totalStock?: number;
};

export type ProductsListMeta = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type ProductsListResponse = {
  success: boolean;
  data: ProductRow[];
  meta: ProductsListMeta;
  message: string;
};

export type ProductMutationResponse = {
  success: boolean;
  data: ProductRow;
  meta: Record<string, unknown>;
  message: string;
};

export type CreateProductBody = {
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
  brandId?: string;
  brandMasterId?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  costPrice?: string;
  tags?: string[];
};

export type UpdateProductBody = Partial<Omit<CreateProductBody, "sku" | "brandId" | "brandMasterId">> & {
  sku?: string;
  brandId?: string | null;
  brandMasterId?: string | null;
};

export type ProductVariantApi = {
  id: string;
  productId: string;
  variantSku: string;
  price: string;
  mrp: string;
  stockQuantity: number;
  attributesJson: Record<string, unknown>;
  status: string;
};

export type ProductImageApi = {
  id: string;
  productId: string;
  variantId?: string | null;
  imageUrl: string;
  isThumbnail: boolean;
  position: number;
};

export type InventoryApi = {
  id: string;
  productId: string;
  variantId: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  stockStatus: string;
};

export type ProductDetailBundle = {
  product: ProductRow & {
    brand: string | null;
    brandSlot?: ProductBrandSlot;
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    costPrice: string | null;
    tags: string[];
  };
  variants: ProductVariantApi[];
  images: ProductImageApi[];
  inventory: InventoryApi[];
};

export type ProductDetailResponse = {
  success: boolean;
  data: ProductDetailBundle;
  message: string;
};

export type CreateVariantBody = {
  variantSku: string;
  price: string;
  mrp: string;
  stockQuantity: number;
  attributesJson: Record<string, unknown>;
  status?: string;
};

export type VariantMutationResponse = {
  success: boolean;
  data: ProductVariantApi;
  meta: Record<string, unknown>;
  message: string;
};

export type UpdateVariantBody = Partial<{
  variantSku: string;
  price: string;
  mrp: string;
  stockQuantity: number;
  attributesJson: Record<string, unknown>;
  status: string;
}>;

export type AddImageBody = {
  variantId?: string;
  imageUrl: string;
  isThumbnail: boolean;
  position: number;
  imageSizeMb?: number;
};

export type UpsertInventoryBody = {
  productId: string;
  variantId?: string;
  stockQuantity: number;
  lowStockThreshold: number;
};
