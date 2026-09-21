import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchProducts } from "@/api/productsApi";
import { usePagination } from "@/hooks/usePagination";
import { ApiError } from "@/lib/apiClient";
import type { ProductRow } from "@/types/product";

const LIMIT = 20;

export function StockOverviewPage() {
  const { page, setPage, reset } = usePagination(1);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const q = useQuery({
    queryKey: ["distributor", "stock", page, search],
    queryFn: () => fetchProducts({ page, limit: LIMIT, search: search || undefined }),
  });

  const rows = q.data?.data ?? [];
  const meta = q.data?.meta;
  const totalPages = meta?.total_pages ?? 1;

  const columns: DataTableColumn<ProductRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Product",
        cell: (r) => (
          <Link to={`/catalog/products/${r.id}`} className="font-medium text-emerald-800 hover:underline">
            {r.name}
          </Link>
        ),
      },
      { id: "sku", header: "SKU", cell: (r) => r.sku },
      {
        id: "stock",
        header: "Total stock",
        cell: (r) => (
          <span className="tabular-nums">
            {r.totalStock != null ? r.totalStock : <span className="text-slate-400">—</span>}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (r) => <Badge variant={r.status === "active" ? "success" : "warning"}>{r.status}</Badge>,
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Stock overview"
        description="Uses catalog `GET /products` totalStock. Adjust per variant on each product page (inventory upsert)."
      />
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">Search</label>
          <input
            className="mt-0.5 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            reset();
            setSearch(draft.trim());
          }}
        >
          Apply
        </Button>
      </div>
      {q.isLoading ? <p className="text-sm text-slate-600">Loading…</p> : null}
      {q.error ? (
        <p className="text-sm text-red-600">
          {q.error instanceof ApiError ? q.error.message : "Failed to load products."}
        </p>
      ) : null}
      {!q.isLoading && !q.error ? (
        <>
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
          {totalPages > 1 ? (
            <div className="mt-4 flex justify-between text-sm text-slate-600">
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
