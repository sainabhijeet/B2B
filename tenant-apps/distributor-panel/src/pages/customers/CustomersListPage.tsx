import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, User } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchCustomers } from "@/api/customersApi";
import { usePagination } from "@/hooks/usePagination";
import { ApiError } from "@/lib/apiClient";
import type { CustomerRow } from "@/types/commerce";

const LIMIT = 15;

function formatInr(amount: string): string {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return amount;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function CustomersListPage() {
  const { page, setPage, reset } = usePagination(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");

  const q = useQuery({
    queryKey: ["distributor", "customers", page, search],
    queryFn: () => fetchCustomers({ page, limit: LIMIT, search: search || undefined }),
  });

  const rows = q.data?.data ?? [];
  const meta = q.data?.meta;
  const totalPages = meta?.total_pages ?? 1;

  const columns: DataTableColumn<CustomerRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Retailer",
        cell: (r) => (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 p-1 text-slate-500">
              <User className="h-3.5 w-3.5" aria-hidden />
            </span>
            <Link to={`/customers/${r.id}`} className="font-medium text-emerald-800 hover:underline">
              {r.name}
            </Link>
          </div>
        ),
      },
      { id: "mobile", header: "Mobile", cell: (r) => r.mobile },
      {
        id: "credit",
        header: "Credit limit",
        cell: (r) => formatInr(r.creditLimit),
      },
      {
        id: "balance",
        header: "Outstanding",
        cell: (r) => formatInr(r.creditBalance),
      },
      {
        id: "status",
        header: "Status",
        cell: (r) => (
          <Badge variant={r.status === "active" ? "success" : "neutral"} className="capitalize">
            {r.status}
          </Badge>
        ),
      },
      {
        id: "go",
        header: "",
        cell: (r) => (
          <Link
            to={`/customers/${r.id}`}
            className="text-xs font-medium text-emerald-700 hover:underline"
          >
            Open
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        description="B2B retailers on your store — credit limits, balances, and ledger from the customers API."
        actions={
          <Link
            to="/customers/new"
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add retailer
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">Search</label>
          <input
            className="mt-0.5 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Name or mobile"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            reset();
            setSearch(searchDraft.trim());
          }}
        >
          Apply
        </Button>
      </div>

      {q.isLoading ? <p className="text-sm text-slate-600">Loading…</p> : null}
      {q.error ? (
        <p className="text-sm text-red-600">
          {q.error instanceof ApiError ? q.error.message : "Failed to load customers."}
        </p>
      ) : null}

      {!q.isLoading && !q.error ? (
        <>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
