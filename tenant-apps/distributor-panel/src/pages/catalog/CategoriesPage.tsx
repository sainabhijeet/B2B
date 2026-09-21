import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { fetchCategories } from "@/api/categoriesApi";
import { ApiError } from "@/lib/apiClient";
import type { CategoryRow } from "@/types/category";

export function CategoriesPage() {
  const q = useQuery({
    queryKey: ["categories", "list-page"],
    queryFn: () => fetchCategories({ page: 1, limit: 100 }),
  });

  const rows = q.data?.data ?? [];
  const err = q.error instanceof ApiError ? q.error.message : q.error ? "Could not load categories." : null;

  const columns: DataTableColumn<CategoryRow>[] = useMemo(
    () => [
      { id: "name", header: "Name", cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
      { id: "slug", header: "Slug", cell: (r) => <span className="font-mono text-xs text-slate-600">{r.slug}</span> },
      {
        id: "scope",
        header: "Scope",
        cell: (r) =>
          r.tenantId == null ? (
            <Badge variant="neutral">Master</Badge>
          ) : (
            <Badge variant="success">Your store</Badge>
          ),
      },
      { id: "level", header: "Level", cell: (r) => <span>{r.level}</span> },
      { id: "status", header: "Status", cell: (r) => <Badge variant="neutral">{r.status}</Badge> },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Master categories from the platform plus categories you create for your catalog."
      />
      {err ? <p className="mb-3 text-sm text-red-700">{err}</p> : null}
      {q.isLoading ? <p className="text-sm text-slate-600">Loading…</p> : null}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
      </div>
    </div>
  );
}
