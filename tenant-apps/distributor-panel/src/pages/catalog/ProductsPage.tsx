import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { deleteProduct, fetchProducts, updateProduct } from "@/api/productsApi";
import { fetchCategories } from "@/api/categoriesApi";
import { useAuth } from "@/hooks/useAuth";
import { usePagination } from "@/hooks/usePagination";
import { ApiError } from "@/lib/apiClient";
import type { ProductRow } from "@/types/product";

const LIMIT = 15;

function statusVariant(status: string): "neutral" | "success" | "warning" {
  const s = status.toLowerCase();
  if (s === "active") return "success";
  if (s === "draft") return "warning";
  return "neutral";
}

export function ProductsPage() {
  const { staffReadOnly } = useAuth();
  const { page, setPage, reset } = usePagination(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMin, setFilterMin] = useState("");
  const [filterMax, setFilterMax] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    categoryId: "" as string,
    status: "" as string,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories", "product-list"],
    queryFn: () => fetchCategories({ page: 1, limit: 100 }),
  });

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categoriesQuery.data?.data ?? []) {
      m.set(c.id, c.name);
    }
    return m;
  }, [categoriesQuery.data?.data]);

  const categoryFilterOptions = useMemo(
    () => [{ value: "", label: "All categories" }, ...(categoriesQuery.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))],
    [categoriesQuery.data?.data],
  );

  const productsQuery = useQuery({
    queryKey: ["products", page, search, appliedFilters],
    queryFn: () =>
      fetchProducts({
        page,
        limit: LIMIT,
        search: search || undefined,
        categoryId: appliedFilters.categoryId || undefined,
        status: appliedFilters.status || undefined,
        minPrice: appliedFilters.minPrice,
        maxPrice: appliedFilters.maxPrice,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelected(new Set());
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await deleteProduct(id);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelected(new Set());
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      for (const id of ids) {
        await updateProduct(id, { status });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelected(new Set());
    },
  });

  const rows = productsQuery.data?.data ?? [];
  const meta = productsQuery.data?.meta;
  const err =
    productsQuery.error instanceof ApiError
      ? productsQuery.error.message
      : productsQuery.error
        ? "Could not load products."
        : null;

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleAllPage = useCallback(() => {
    if (allOnPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of rows) next.delete(r.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const r of rows) next.add(r.id);
        return next;
      });
    }
  }, [allOnPageSelected, rows]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const applyFilters = () => {
    reset();
    const minN = filterMin.trim() === "" ? undefined : Number(filterMin);
    const maxN = filterMax.trim() === "" ? undefined : Number(filterMax);
    setAppliedFilters({
      categoryId: filterCategory,
      status: filterStatus,
      minPrice: minN != null && !Number.isNaN(minN) ? minN : undefined,
      maxPrice: maxN != null && !Number.isNaN(maxN) ? maxN : undefined,
    });
  };

  const bulkIds = useMemo(() => [...selected], [selected]);

  const columns: DataTableColumn<ProductRow>[] = useMemo(() => {
    const cols: DataTableColumn<ProductRow>[] = [];
    if (!staffReadOnly) {
      cols.push({
        id: "sel",
        header: (
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={toggleAllPage}
            aria-label="Select all on page"
            className="rounded border-slate-300"
          />
        ),
        className: "w-10",
        cell: (r) => (
          <input
            type="checkbox"
            checked={selected.has(r.id)}
            onChange={() => toggleOne(r.id)}
            aria-label={`Select ${r.name}`}
            className="rounded border-slate-300"
            onClick={(e) => e.stopPropagation()}
          />
        ),
      });
    }
    cols.push(
      {
        id: "img",
        header: "Image",
        className: "w-16",
        cell: (r) =>
          r.thumbnailUrl ? (
            <img src={r.thumbnailUrl} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">
              —
            </div>
          ),
      },
      {
        id: "name",
        header: "Product",
        cell: (r) => (
          <div>
            <Link to={`/catalog/products/${r.id}`} className="font-medium text-emerald-800 hover:underline">
              {r.name}
            </Link>
            <div className="font-mono text-xs text-slate-500">{r.sku}</div>
          </div>
        ),
      },
      {
        id: "category",
        header: "Category",
        cell: (r) => <span className="text-slate-700">{categoryNameById.get(r.categoryId) ?? "—"}</span>,
      },
      {
        id: "price",
        header: "Price",
        className: "whitespace-nowrap",
        cell: (r) => <span className="font-mono text-sm">{r.price}</span>,
      },
      {
        id: "stock",
        header: "Stock",
        className: "whitespace-nowrap text-right",
        cell: (r) => <span className="font-mono text-sm">{r.totalStock ?? 0}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
      },
      {
        id: "actions",
        header: "Actions",
        className: "w-36 text-right",
        cell: (r) => (
          <div className="flex justify-end gap-0.5">
            <Link
              to={`/catalog/products/${r.id}`}
              className="inline-flex rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title="View"
            >
              <Eye className="h-4 w-4" aria-hidden />
            </Link>
            {!staffReadOnly ? (
              <Link
                to={`/catalog/products/${r.id}/edit`}
                className="inline-flex rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                title="Edit"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
            {!staffReadOnly ? (
              <button
                type="button"
                title="Delete"
                disabled={deleteMutation.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!window.confirm(`Delete “${r.name}”?`)) return;
                  deleteMutation.mutate(r.id);
                }}
                className="inline-flex rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        ),
      },
    );
    return cols;
  }, [
    staffReadOnly,
    allOnPageSelected,
    toggleAllPage,
    toggleOne,
    selected,
    categoryNameById,
    deleteMutation.isPending,
  ]);

  return (
    <div>
      <PageHeader
        title="Products"
        description="Filters, bulk status, and links to the full create / edit flow with variants, images, and inventory."
        actions={
          staffReadOnly ? null : (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/catalog/products/create"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add product
              </Link>
              <Link
                to="/catalog/products/create/classic"
                className="text-sm font-medium text-emerald-700 underline-offset-2 hover:underline"
              >
                Advanced form (all fields)
              </Link>
            </div>
          )
        }
      />

      <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-medium text-slate-600">
          Category
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
          >
            {categoryFilterOptions.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Status
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
          >
            <option value="">Any</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Min price
          <input
            value={filterMin}
            onChange={(e) => setFilterMin(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Max price
          <input
            value={filterMax}
            onChange={(e) => setFilterMax(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-md border border-slate-200 px-2 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form
          className="flex max-w-md flex-1 flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            reset();
            setSearch(searchDraft.trim());
          }}
        >
          <label className="block min-w-[12rem] flex-1 text-xs font-medium text-slate-600">
            Search
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Name, SKU, category…"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={applyFilters}>
            Apply filters
          </Button>
        </div>
        {meta ? (
          <p className="text-xs text-slate-500">
            Page {meta.page} of {Math.max(1, meta.total_pages)} · {meta.total} products
          </p>
        ) : null}
      </div>

      {!staffReadOnly && bulkIds.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          <span>{bulkIds.length} selected</span>
          <Button
            type="button"
            variant="secondary"
            disabled={patchMutation.isPending}
            onClick={() => {
              if (!window.confirm("Set selected products to Active?")) return;
              patchMutation.mutate({ ids: bulkIds, status: "active" });
            }}
          >
            Bulk enable
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={patchMutation.isPending}
            onClick={() => {
              if (!window.confirm("Set selected products to Draft?")) return;
              patchMutation.mutate({ ids: bulkIds, status: "draft" });
            }}
          >
            Bulk disable
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={bulkDeleteMutation.isPending}
            onClick={() => {
              if (!window.confirm(`Delete ${bulkIds.length} products?`)) return;
              bulkDeleteMutation.mutate(bulkIds);
            }}
          >
            Bulk delete
          </Button>
        </div>
      ) : null}

      {patchMutation.isError && patchMutation.error instanceof ApiError ? (
        <p className="mb-3 text-sm text-red-700">{patchMutation.error.message}</p>
      ) : null}
      {bulkDeleteMutation.isError && bulkDeleteMutation.error instanceof ApiError ? (
        <p className="mb-3 text-sm text-red-700">{bulkDeleteMutation.error.message}</p>
      ) : null}
      {deleteMutation.isError && deleteMutation.error instanceof ApiError ? (
        <p className="mb-3 text-sm text-red-700">{deleteMutation.error.message}</p>
      ) : null}
      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        CSV import is planned as a distributor-only bulk ingest path (separate from this table).
      </p>

      {meta && meta.total_pages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="secondary" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={page >= meta.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
