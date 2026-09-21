import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/forms/FormInput";
import {
  createTenantBrand,
  deleteTenantBrand,
  fetchBrandsCatalog,
  updateTenantBrand,
  type MergedBrandOption,
} from "@/api/brandsApi";
import { ApiError } from "@/lib/apiClient";

type Row = MergedBrandOption;

function errMsg(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

export function BrandsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["brands", "catalog"],
    queryFn: fetchBrandsCatalog,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<MergedBrandOption | null>(null);

  const [newName, setNewName] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState<"active" | "inactive">("active");

  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");

  const [formError, setFormError] = useState<string | null>(null);

  const rows = q.data?.data ?? [];
  const loadErr = q.error ? errMsg(q.error, "Could not load brands.") : null;

  const createMu = useMutation({
    mutationFn: createTenantBrand,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["brands", "catalog"] });
      setAddOpen(false);
      setNewName("");
      setNewLogoUrl("");
      setNewDescription("");
      setNewStatus("active");
      setFormError(null);
    },
    onError: (e) => setFormError(errMsg(e, "Could not create brand.")),
  });

  const updateMu = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateTenantBrand>[1] }) =>
      updateTenantBrand(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["brands", "catalog"] });
      setEditRow(null);
      setFormError(null);
    },
    onError: (e) => setFormError(errMsg(e, "Could not update brand.")),
  });

  const deleteMu = useMutation({
    mutationFn: deleteTenantBrand,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["brands", "catalog"] });
      setFormError(null);
    },
    onError: (e) => setFormError(errMsg(e, "Could not delete brand.")),
  });

  const openEdit = useCallback((r: MergedBrandOption) => {
    if (r.type !== "tenant") return;
    setFormError(null);
    setEditRow(r);
    setEditName(r.name);
    setEditSlug(r.slug);
    setEditLogoUrl(r.logoUrl ?? "");
    setEditDescription(r.description?.trim() ? r.description : "");
    setEditStatus(r.status === "inactive" ? "inactive" : "active");
  }, []);

  const columns: DataTableColumn<Row>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (r) => (
          <div className="flex items-center gap-2">
            {r.logoUrl ? (
              <img
                src={r.logoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded border border-slate-100 object-contain"
              />
            ) : null}
            <span className="font-medium text-slate-900">{r.name}</span>
          </div>
        ),
      },
      { id: "slug", header: "Slug", cell: (r) => <span className="font-mono text-xs text-slate-600">{r.slug}</span> },
      {
        id: "scope",
        header: "Source",
        cell: (r) =>
          r.type === "master" ? (
            <Badge variant="neutral">Platform</Badge>
          ) : (
            <Badge variant="success">Your store</Badge>
          ),
      },
      {
        id: "status",
        header: "Status",
        cell: (r) => <Badge variant="neutral">{r.status ?? "active"}</Badge>,
      },
      {
        id: "actions",
        header: "",
        className: "w-40 text-right",
        cell: (r) =>
          r.type === "tenant" ? (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => openEdit(r)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="!px-2 !py-1 text-xs text-red-700"
                disabled={deleteMu.isPending}
                onClick={() => {
                  if (!window.confirm(`Delete brand “${r.name}”? Products must not use it.`)) return;
                  deleteMu.mutate(r.id);
                }}
              >
                Delete
              </Button>
            </div>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          ),
      },
    ],
    [deleteMu.isPending, openEdit],
  );

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Platform catalog brands plus custom brands stored in your tenant schema. Product forms use the same merged list."
        actions={
          <Button
            type="button"
            onClick={() => {
              setFormError(null);
              setAddOpen(true);
            }}
          >
            + Add brand
          </Button>
        }
      />

      {loadErr ? <p className="mb-3 text-sm text-red-700">{loadErr}</p> : null}
      {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
      {q.isLoading ? <p className="text-sm text-slate-600">Loading…</p> : null}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <DataTable columns={columns} rows={rows} rowKey={(r) => `${r.type}:${r.id}`} />
      </div>

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="brand-add-title"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
            <h3 id="brand-add-title" className="text-sm font-semibold text-slate-900">
              Add brand
            </h3>
            <p className="mt-1 text-xs text-slate-600">Creates a row in your tenant catalog (not a platform master).</p>
            <div className="mt-4 space-y-3">
              <FormInput id="b-add-name" label="Brand name" required value={newName} onChange={(e) => setNewName(e.target.value)} />
              <FormInput
                id="b-add-logo"
                label="Logo URL (optional)"
                value={newLogoUrl}
                onChange={(e) => setNewLogoUrl(e.target.value)}
                placeholder="https://…"
              />
              <div>
                <label htmlFor="b-add-desc" className="block text-xs font-medium text-slate-700">
                  Description (optional)
                </label>
                <textarea
                  id="b-add-desc"
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="b-add-status" className="block text-xs font-medium text-slate-700">
                  Status
                </label>
                <select
                  id="b-add-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as "active" | "inactive")}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAddOpen(false);
                  setFormError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={createMu.isPending || !newName.trim()}
                onClick={() => {
                  const nm = newName.trim();
                  if (!nm) return;
                  createMu.mutate({
                    name: nm,
                    logoUrl: newLogoUrl.trim() || undefined,
                    description: newDescription.trim() || undefined,
                    status: newStatus,
                  });
                }}
              >
                {createMu.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="brand-edit-title"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
            <h3 id="brand-edit-title" className="text-sm font-semibold text-slate-900">
              Edit brand
            </h3>
            <div className="mt-4 space-y-3">
              <FormInput id="b-edit-name" label="Brand name" required value={editName} onChange={(e) => setEditName(e.target.value)} />
              <FormInput id="b-edit-slug" label="Slug" required value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
              <FormInput
                id="b-edit-logo"
                label="Logo URL"
                value={editLogoUrl}
                onChange={(e) => setEditLogoUrl(e.target.value)}
                placeholder="Leave empty to clear"
              />
              <div>
                <label htmlFor="b-edit-desc" className="block text-xs font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="b-edit-desc"
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="b-edit-status" className="block text-xs font-medium text-slate-700">
                  Status
                </label>
                <select
                  id="b-edit-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as "active" | "inactive")}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditRow(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updateMu.isPending || !editName.trim() || !editSlug.trim()}
                onClick={() => {
                  const id = editRow.id;
                  updateMu.mutate({
                    id,
                    body: {
                      name: editName.trim(),
                      slug: editSlug.trim(),
                      logoUrl: editLogoUrl.trim(),
                      description: editDescription.trim(),
                      status: editStatus,
                    },
                  });
                }}
              >
                {updateMu.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
