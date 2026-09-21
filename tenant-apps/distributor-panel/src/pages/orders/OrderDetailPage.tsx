import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import {
  deliverOrder,
  dispatchOrder,
  fetchOrder,
  orderPaymentAction,
  reviewOrderRequest,
  updateOrderStatus,
} from "@/api/ordersApi";
import { generateInvoice } from "@/api/invoicesApi";
import { fetchInvoices } from "@/api/invoicesApi";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/apiClient";
import type { OrderItemRow } from "@/types/commerce";

function formatInr(amount: string): string {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return amount;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = id ?? "";
  const qc = useQueryClient();
  const { staffReadOnly } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);

  const orderQ = useQuery({
    queryKey: ["distributor", "orders", orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: Boolean(orderId),
  });

  const invoicesQ = useQuery({
    queryKey: ["distributor", "invoices"],
    queryFn: async () => (await fetchInvoices()).data ?? [],
  });

  const order = orderQ.data?.data;
  const orderInvoices = useMemo(
    () => (invoicesQ.data ?? []).filter((inv) => inv.orderId === orderId),
    [invoicesQ.data, orderId],
  );

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["distributor", "orders"] });
    void qc.invalidateQueries({ queryKey: ["distributor", "orders", orderId] });
    void qc.invalidateQueries({ queryKey: ["distributor", "invoices"] });
  }, [qc, orderId]);

  const statusMut = useMutation({
    mutationFn: (status: string) => updateOrderStatus(orderId, status),
    onMutate: () => setActionError(null),
    onSuccess: invalidate,
    onError: (e: unknown) =>
      setActionError(e instanceof ApiError ? e.message : "Could not update order status."),
  });

  const paymentMut = useMutation({
    mutationFn: ({ action, reason }: { action: "approve" | "verify" | "reject"; reason?: string }) =>
      orderPaymentAction(orderId, action, reason),
    onMutate: () => setActionError(null),
    onSuccess: invalidate,
    onError: (e: unknown) =>
      setActionError(e instanceof ApiError ? e.message : "Could not update payment."),
  });

  const requestMut = useMutation({
    mutationFn: ({ requestId, action, note }: { requestId: string; action: "START_REVIEW" | "APPROVE" | "REJECT" | "MARK_SHIPPED" | "COMPLETE"; note?: string }) =>
      reviewOrderRequest(orderId, requestId, action, note),
    onMutate: () => setActionError(null),
    onSuccess: invalidate,
    onError: (e: unknown) =>
      setActionError(e instanceof ApiError ? e.message : "Could not review order request."),
  });

  const dispatchMut = useMutation({
    mutationFn: () => dispatchOrder(orderId),
    onMutate: () => setActionError(null),
    onSuccess: invalidate,
    onError: (e: unknown) =>
      setActionError(e instanceof ApiError ? e.message : "Could not dispatch order."),
  });

  const deliverMut = useMutation({
    mutationFn: () => deliverOrder(orderId),
    onMutate: () => setActionError(null),
    onSuccess: invalidate,
    onError: (e: unknown) =>
      setActionError(e instanceof ApiError ? e.message : "Could not mark delivered."),
  });

  const invoiceMut = useMutation({
    mutationFn: () => generateInvoice(orderId),
    onMutate: () => setActionError(null),
    onSuccess: invalidate,
    onError: (e: unknown) =>
      setActionError(e instanceof ApiError ? e.message : "Could not generate invoice."),
  });

  const itemColumns: DataTableColumn<OrderItemRow>[] = useMemo(
    () => [
      { id: "sku", header: "SKU", cell: (r) => r.variantSku ?? "—" },
      { id: "qty", header: "Qty", cell: (r) => String(r.quantity) },
      { id: "price", header: "Unit", cell: (r) => formatInr(r.price) },
      { id: "tax", header: "Tax %", cell: (r) => `${r.taxRate}%` },
      { id: "taxAmt", header: "Tax", cell: (r) => formatInr(r.taxAmount) },
      { id: "line", header: "Line total", cell: (r) => formatInr(r.totalPrice) },
    ],
    [],
  );

  const busy =
    statusMut.isPending ||
    paymentMut.isPending ||
    requestMut.isPending ||
    dispatchMut.isPending ||
    deliverMut.isPending ||
    invoiceMut.isPending;

  if (!orderId) {
    return <p className="text-sm text-slate-600">Missing order id.</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/orders" className="text-sm font-medium text-emerald-700 hover:underline">
          ← Orders
        </Link>
      </div>
      <PageHeader
        title={order ? `Order ${order.orderNumber}` : "Order"}
        description="Fulfilment and invoicing use the Nest orders + invoices APIs."
      />

      {orderQ.isLoading ? <p className="text-sm text-slate-600">Loading…</p> : null}
      {orderQ.error ? (
        <p className="text-sm text-red-600">
          {orderQ.error instanceof ApiError ? orderQ.error.message : "Failed to load order."}
        </p>
      ) : null}

      {actionError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{actionError}</div>
      ) : null}

      {order ? (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Status</p>
              <Badge variant="neutral" className="mt-1 capitalize">
                {order.status.replace(/_/g, " ").toLowerCase()}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Payment</p>
              <p className="mt-1 text-sm text-slate-800">
                {order.paymentMode} · {order.paymentStatus}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Total</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatInr(order.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Placed</p>
              <p className="mt-1 text-sm text-slate-700">
                {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
              </p>
            </div>
          </div>

          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-900">Line items</h2>
            <div className="mt-2">
              <DataTable columns={itemColumns} rows={order.items ?? []} rowKey={(r) => r.id} />
            </div>
          </section>

          {orderInvoices.length > 0 ? (
            <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Invoices</h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {orderInvoices.map((inv) => (
                  <li key={inv.id}>
                    <Link to="/invoices" className="text-emerald-700 hover:underline">
                      {inv.invoiceNumber}
                    </Link>{" "}
                    · {formatInr(inv.totalAmount)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {order.payment ? (
            <section className="mb-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Payment submission</h2>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Status</p>
                  <p className="mt-1 font-semibold text-slate-900">{order.payment.status}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Method</p>
                  <p className="mt-1 font-semibold text-slate-900">{order.payment.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">UTR</p>
                  <p className="mt-1 font-mono text-slate-900">{order.payment.utrNumber ?? order.payment.paymentReference ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Amount</p>
                  <p className="mt-1 font-semibold text-slate-900">{formatInr(order.payment.amount ?? order.totalAmount)}</p>
                </div>
              </div>
              {order.payment.paymentScreenshotUrl ? (
                <a
                  className="mt-3 inline-flex text-sm font-medium text-emerald-700 hover:underline"
                  href={order.payment.paymentScreenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View uploaded proof
                </a>
              ) : null}
              {order.payment.rejectionReason ? (
                <p className="mt-3 text-sm text-red-700">{order.payment.rejectionReason}</p>
              ) : null}
            </section>
          ) : null}

          {(order.requests?.length ?? 0) > 0 ? (
            <section className="mb-8 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Order requests</h2>
              <div className="mt-3 space-y-3">
                {order.requests?.map((request) => (
                  <div key={request.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {request.type} · {request.status}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{request.reason}</p>
                        {request.description ? (
                          <p className="mt-1 text-sm text-slate-600">{request.description}</p>
                        ) : null}
                        {(request.photoUrls ?? []).length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(request.photoUrls ?? []).map((url, index) => (
                              <a key={url} href={url} target="_blank" rel="noreferrer" aria-label={`Open evidence photo ${index + 1}`}>
                                <img src={url} alt={`Replacement evidence ${index + 1}`} className="h-20 w-20 rounded-md border border-slate-200 object-cover" />
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {request.reviewNote ? (
                          <p className="mt-1 text-xs text-slate-500">Review: {request.reviewNote}</p>
                        ) : null}
                        {request.replacementShipment ? (
                          <p className="mt-1 text-xs font-medium text-emerald-700">Shipment: {request.replacementShipment.status}</p>
                        ) : null}
                      </div>
                      {request.status === "REQUESTED" ? (
                        <Button
                          type="button"
                          disabled={staffReadOnly || busy}
                          onClick={() => requestMut.mutate({ requestId: request.id, action: "START_REVIEW" })}
                        >
                          Start review
                        </Button>
                      ) : null}
                      {request.status === "UNDER_REVIEW" ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            disabled={staffReadOnly || busy}
                            onClick={() => {
                              const note = window.prompt("Approval remarks")?.trim();
                              if (!note) return;
                              requestMut.mutate({ requestId: request.id, action: "APPROVE", note });
                            }}
                          >
                            Approve replacement
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={staffReadOnly || busy}
                            onClick={() => {
                              const note = window.prompt("Rejection remarks")?.trim();
                              if (!note) return;
                              requestMut.mutate({ requestId: request.id, action: "REJECT", note });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : null}
                      {request.status === "APPROVED" ? (
                        <Button type="button" disabled={staffReadOnly || busy} onClick={() => requestMut.mutate({ requestId: request.id, action: "MARK_SHIPPED" })}>
                          Mark replacement shipped
                        </Button>
                      ) : null}
                      {request.status === "REPLACEMENT_SHIPPED" ? (
                        <Button type="button" disabled={staffReadOnly || busy} onClick={() => requestMut.mutate({ requestId: request.id, action: "COMPLETE" })}>
                          Complete request
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Actions</h2>
            <p className="mt-1 text-xs text-slate-500">
              Credit orders: move to Processing, generate invoice, then dispatch. UPI/NEFT: verify submitted proof (moves
              to Processing + invoice), then dispatch.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {order.status === "PENDING" ? (
                <Button
                  type="button"
                  disabled={staffReadOnly || busy}
                  onClick={() => {
                    setActionError(null);
                    statusMut.mutate("PROCESSING");
                  }}
                >
                  Mark processing
                </Button>
              ) : null}
              {order.status === "PAYMENT_UPLOADED" || order.paymentStatus === "SUBMITTED" ? (
                <>
                  <Button
                    type="button"
                    disabled={staffReadOnly || busy}
                    onClick={() => {
                      setActionError(null);
                      paymentMut.mutate({ action: "verify" });
                    }}
                  >
                    Verify payment
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={staffReadOnly || busy}
                    onClick={() => {
                      setActionError(null);
                      const reason = window.prompt("Reason for rejecting this payment?")?.trim();
                      if (!reason) return;
                      paymentMut.mutate({ action: "reject", reason });
                    }}
                  >
                    Reject payment
                  </Button>
                </>
              ) : null}
              {order.status === "PROCESSING" ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={staffReadOnly || busy}
                    onClick={() => {
                      setActionError(null);
                      invoiceMut.mutate();
                    }}
                  >
                    Generate invoice
                  </Button>
                  <Button
                    type="button"
                    disabled={staffReadOnly || busy}
                    onClick={() => {
                      setActionError(null);
                      dispatchMut.mutate();
                    }}
                  >
                    Dispatch
                  </Button>
                </>
              ) : null}
              {order.status === "DISPATCHED" ? (
                <Button
                  type="button"
                  disabled={staffReadOnly || busy}
                  onClick={() => {
                    setActionError(null);
                    deliverMut.mutate();
                  }}
                >
                  Mark delivered
                </Button>
              ) : null}
              {order.status !== "CANCELLED" && order.status !== "DELIVERED" ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={staffReadOnly || busy}
                  onClick={() => {
                    setActionError(null);
                    statusMut.mutate("CANCELLED");
                  }}
                >
                  Cancel order
                </Button>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
