import { apiGet, apiPost } from "@/lib/apiClient";
import type { InvoiceDownloadEnvelope, InvoicesListEnvelope } from "@/types/commerce";

export function fetchInvoices(): Promise<InvoicesListEnvelope> {
  return apiGet<InvoicesListEnvelope>("/invoices");
}

export function generateInvoice(orderId: string): Promise<{ success: boolean; data: unknown }> {
  return apiPost("/invoices/generate", { orderId });
}

export function downloadInvoiceMeta(id: string): Promise<InvoiceDownloadEnvelope> {
  return apiGet<InvoiceDownloadEnvelope>(`/invoices/${encodeURIComponent(id)}/download`);
}
