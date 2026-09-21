import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { downloadInvoiceMeta, fetchInvoices } from "@/api/invoicesApi";
import { ApiError } from "@/lib/apiClient";
import type { InvoiceRow } from "@/types/commerce";

function formatInr(amount: string): string {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return amount;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function InvoicesListPage() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["distributor", "invoices"],
    queryFn: async () => (await fetchInvoices()).data ?? [],
  });

  const columns: DataTableColumn<InvoiceRow>[] = [
    { id: "num", header: "Invoice #", cell: (r) => <span className="font-mono text-sm">{r.invoiceNumber}</span> },
    {
      id: "order",
      header: "Order",
      cell: (r) => (
        <Link to={`/orders/${r.orderId}`} className="text-emerald-700 hover:underline">
          Open order
        </Link>
      ),
    },
    { id: "date", header: "Date", cell: (r) => r.invoiceDate },
    { id: "amt", header: "Amount", cell: (r) => formatInr(r.totalAmount) },
    {
      id: "st",
      header: "Status",
      cell: (r) => <Badge variant="neutral">{r.status}</Badge>,
    },
    {
      id: "dl",
      header: "",
      cell: (r) => (
        <Button
          type="button"
          variant="secondary"
          className="text-xs"
          disabled={busyId === r.id}
          onClick={async () => {
            setBusyId(r.id);
            try {
              const res = await downloadInvoiceMeta(r.id);
              const d = res.data;
              window.alert(`${d.invoiceNumber}\n${d.note}`);
            } catch (e) {
              window.alert(e instanceof ApiError ? e.message : "Download failed");
            } finally {
              setBusyId(null);
            }
          }}
        >
          Download info
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="From `GET /invoices`. Invoices are created when prepaid payment is approved (order → PROCESSING) or via Generate invoice on the order detail screen."
      />
      {q.isLoading ? <p className="text-sm text-slate-600">Loading…</p> : null}
      {q.error ? (
        <p className="text-sm text-red-600">
          {q.error instanceof ApiError ? q.error.message : "Failed to load invoices."}
        </p>
      ) : null}
      {!q.isLoading && !q.error ? (
        <DataTable columns={columns} rows={q.data ?? []} rowKey={(r) => r.id} />
      ) : null}
    </div>
  );
}
