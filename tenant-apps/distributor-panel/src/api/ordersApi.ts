import { apiGet, apiPut } from "@/lib/apiClient";
import type { OrderDetailEnvelope, OrderRow, OrdersListEnvelope } from "@/types/commerce";

export function fetchOrders(): Promise<OrdersListEnvelope> {
  return apiGet<OrdersListEnvelope>("/orders");
}

export function fetchOrder(id: string): Promise<OrderDetailEnvelope> {
  return apiGet<OrderDetailEnvelope>(`/orders/${encodeURIComponent(id)}`);
}

export function updateOrderStatus(id: string, status: string): Promise<{ success: boolean; data: OrderRow }> {
  return apiPut<{ success: boolean; data: OrderRow }>(`/orders/${encodeURIComponent(id)}/status`, { status });
}

export function orderPaymentAction(
  id: string,
  action: "approve" | "verify" | "reject",
  reason?: string,
): Promise<{ success: boolean; data: unknown }> {
  return apiPut(`/orders/${encodeURIComponent(id)}/payment`, { action, reason });
}

export function reviewOrderRequest(
  orderId: string,
  requestId: string,
  action: "START_REVIEW" | "APPROVE" | "REJECT" | "MARK_SHIPPED" | "COMPLETE",
  note?: string,
): Promise<{ success: boolean; data: unknown }> {
  return apiPut(
    `/orders/${encodeURIComponent(orderId)}/requests/${encodeURIComponent(requestId)}`,
    { action, note },
  );
}

export function dispatchOrder(id: string): Promise<{ success: boolean; data: OrderRow }> {
  return apiPut(`/orders/${encodeURIComponent(id)}/dispatch`, {});
}

export function deliverOrder(id: string): Promise<{ success: boolean; data: OrderRow }> {
  return apiPut(`/orders/${encodeURIComponent(id)}/deliver`, {});
}
