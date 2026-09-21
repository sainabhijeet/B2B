import { apiDelete, apiGet, apiPost } from "@/lib/apiClient";

export type PricingVariantRow = {
  id: string;
  variantSku: string;
  price: string;
  mrp: string;
  status: string;
};

export type PricingCustomerPriceRow = {
  id: string;
  customerId: string;
  customerName: string;
  productVariantId: string;
  price: string;
};

export type PricingGroupPriceRow = {
  id: string;
  groupId: string;
  groupName: string;
  productVariantId: string;
  price: string;
};

export type PricingQuantityRow = {
  id: string;
  productVariantId: string;
  minQty: number;
  price: string;
};

export type PricingGroupRow = { id: string; name: string };

export type ProductPricingSummary = {
  product: { id: string; name: string; slug: string; tenantId: string };
  variants: PricingVariantRow[];
  customerPrices: PricingCustomerPriceRow[];
  groupPrices: PricingGroupPriceRow[];
  quantityPrices: PricingQuantityRow[];
  groups: PricingGroupRow[];
};

type SummaryResponse = { success: boolean; data: ProductPricingSummary };

export function fetchProductPricingSummary(productId: string): Promise<SummaryResponse> {
  return apiGet<SummaryResponse>(`/catalog/pricing/products/${productId}`);
}

export function upsertCustomerPrice(body: {
  customerId: string;
  productVariantId: string;
  price: string;
}): Promise<unknown> {
  return apiPost("/catalog/pricing/customer-prices", body);
}

export function deleteCustomerPrice(id: string): Promise<unknown> {
  return apiDelete(`/catalog/pricing/customer-prices/${id}`);
}

export function upsertGroupPrice(body: {
  groupId: string;
  productVariantId: string;
  price: string;
}): Promise<unknown> {
  return apiPost("/catalog/pricing/group-prices", body);
}

export function deleteGroupPrice(id: string): Promise<unknown> {
  return apiDelete(`/catalog/pricing/group-prices/${id}`);
}

export function upsertQuantityPrice(body: {
  productVariantId: string;
  minQty: number;
  price: string;
}): Promise<unknown> {
  return apiPost("/catalog/pricing/quantity-prices", body);
}

export function deleteQuantityPrice(id: string): Promise<unknown> {
  return apiDelete(`/catalog/pricing/quantity-prices/${id}`);
}

export function fetchCustomerGroups(): Promise<{ success: boolean; data: { id: string; name: string }[] }> {
  return apiGet(`/catalog/pricing/customer-groups`);
}

export function createCustomerGroup(name: string): Promise<unknown> {
  return apiPost("/catalog/pricing/customer-groups", { name });
}

export function addGroupMember(groupId: string, customerId: string): Promise<unknown> {
  return apiPost(`/catalog/pricing/customer-groups/${groupId}/members`, { customerId });
}

export function deleteCustomerGroup(id: string): Promise<unknown> {
  return apiDelete(`/catalog/pricing/customer-groups/${id}`);
}
