import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { fetchOrders } from "@/api/ordersApi";
import { ApiError } from "@/lib/apiClient";
import type { OrderRow } from "@/types/commerce";

function statusVariant(status: string): "neutral" | "success" | "warning" {
  const s = status.toUpperCase();
  if (s === "DELIVERED") return "success";
  if (s === "CANCELLED") return "neutral";
  if (s === "PENDING" || s === "PAYMENT_UPLOADED") return "warning";
  return "neutral";
}

function formatInr(amount: string): string {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return amount;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function OrdersListPage() {
  const q = useQuery({
    queryKey: ["distributor", "orders"],
    queryFn: async () => {
      const res = await fetchOrders();
      return res.data ?? [];
    },
  });

  const columns: DataTableColumn<OrderRow>[] = useMemo(
    () => [
      {
        id: "orderNumber",
        header: "Order",
        cell: (row) => (
          <Link to={`/orders/${row.id}`} className="font-medium text-emerald-800 hover:underline">
            {row.orderNumber}
          </Link>
        ),
      },
      {
        id: "buyer",
        header: "Buyer user",
        cell: (row) => <span className="font-mono text-xs text-slate-600">{row.userId.slice(0, 8)}…</span>,
      },
      {
        id: "total",
        header: "Total",
        cell: (row) => formatInr(row.totalAmount),
      },
      {
        id: "payment",
        header: "Payment",
        cell: (row) => (
          <span className="text-xs text-slate-600">
            {row.paymentMode}
            <span className="mx-1 text-slate-300">·</span>
            {row.paymentStatus}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <Badge variant={statusVariant(row.status)} className="capitalize">
            {row.status.replace(/_/g, " ").toLowerCase()}
          </Badge>
        ),
      },
      {
        id: "created",
        header: "Date",
        cell: (row) => (
          <span className="text-xs text-slate-600">
            {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <Link
            to={`/orders/${row.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            View
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Retailer orders for your tenant. Confirm payment, move to processing, dispatch, and mark delivered."
      />
      {q.isLoading ? <p className="text-sm text-slate-600">Loading orders…</p> : null}
      {q.error ? (
        <p className="text-sm text-red-600">{q.error instanceof ApiError ? q.error.message : "Failed to load orders."}</p>
      ) : null}
      {!q.isLoading && !q.error ? (
        <DataTable columns={columns} rows={q.data ?? []} rowKey={(r) => r.id} />
      ) : null}
    </div>
  );
}
