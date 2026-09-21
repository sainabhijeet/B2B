import { apiGet, apiPatch, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import type {
  CreateCustomerBody,
  CustomerDetailEnvelope,
  CustomerWhatsappPermissionsEnvelope,
  CustomerWhatsappPermissionsRow,
  CustomersListEnvelope,
  CreditLedgerEnvelope,
  UpdateCustomerBody,
} from "@/types/commerce";

export function fetchCustomers(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<CustomersListEnvelope> {
  const q = new URLSearchParams();
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));
  if (params.search?.trim()) q.set("search", params.search.trim());
  const qs = q.toString();
  return apiGet<CustomersListEnvelope>(`/customers${qs ? `?${qs}` : ""}`);
}

export function fetchCustomer(id: string): Promise<CustomerDetailEnvelope> {
  return apiGet<CustomerDetailEnvelope>(`/customers/${encodeURIComponent(id)}`);
}

export function createCustomer(body: CreateCustomerBody): Promise<CustomerDetailEnvelope> {
  return apiPost<CustomerDetailEnvelope>("/customers", body);
}

export function updateCustomer(id: string, body: UpdateCustomerBody): Promise<CustomerDetailEnvelope> {
  return apiPut<CustomerDetailEnvelope>(`/customers/${encodeURIComponent(id)}`, body);
}

export function deleteCustomer(id: string): Promise<{ success: boolean }> {
  return apiDelete(`/customers/${encodeURIComponent(id)}`);
}

export function fetchCreditLedger(
  customerId: string,
  params: { page?: number; limit?: number } = {},
): Promise<CreditLedgerEnvelope> {
  const q = new URLSearchParams();
  if (params.page != null) q.set("page", String(params.page));
  if (params.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiGet<CreditLedgerEnvelope>(
    `/customers/${encodeURIComponent(customerId)}/credit-ledger${qs ? `?${qs}` : ""}`,
  );
}

export function postCreditAdjust(
  customerId: string,
  body: { entryType: "ADJUSTMENT_DEBIT" | "ADJUSTMENT_CREDIT"; magnitude: string },
): Promise<CustomerDetailEnvelope> {
  return apiPost<CustomerDetailEnvelope>(
    `/customers/${encodeURIComponent(customerId)}/credit-adjust`,
    body,
  );
}

export function postCreditWriteOff(customerId: string, amount: string): Promise<CustomerDetailEnvelope> {
  return apiPost<CustomerDetailEnvelope>(
    `/customers/${encodeURIComponent(customerId)}/credit-write-off`,
    { amount },
  );
}

export function postCreditAddLimit(customerId: string, amount: string): Promise<CustomerDetailEnvelope> {
  return apiPost<CustomerDetailEnvelope>(`/customers/${encodeURIComponent(customerId)}/credit/add`, { amount });
}

export function postCreditPayment(customerId: string, amount: string): Promise<CustomerDetailEnvelope> {
  return apiPost<CustomerDetailEnvelope>(`/customers/${encodeURIComponent(customerId)}/credit/pay`, { amount });
}

export function fetchCustomerWhatsappPermissions(
  customerId: string,
): Promise<CustomerWhatsappPermissionsEnvelope> {
  return apiGet<CustomerWhatsappPermissionsEnvelope>(
    `/customers/${encodeURIComponent(customerId)}/whatsapp-permissions`,
  );
}

export function patchCustomerWhatsappPermissions(
  customerId: string,
  body: Partial<CustomerWhatsappPermissionsRow>,
): Promise<CustomerWhatsappPermissionsEnvelope> {
  return apiPatch<CustomerWhatsappPermissionsEnvelope>(
    `/customers/${encodeURIComponent(customerId)}/whatsapp-permissions`,
    body,
  );
}
