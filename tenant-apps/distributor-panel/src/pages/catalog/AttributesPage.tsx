import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/forms/FormInput";
import {
  createAttribute,
  createAttributeValue,
  deleteAttribute,
  fetchAttributeValues,
  fetchAttributesAll,
  updateAttribute,
  type AttributeRow,
  type AttributeValueRow,
} from "@/api/attributesApi";
import { ApiError } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";

type Row = AttributeRow;

function errMsg(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isTenantAttribute(r: Row): boolean {
  return r.tenantId != null;
}

export function AttributesPage() {
  const qc = useQueryClient();
  const { staffReadOnly } = useAuth();

  const q = useQuery({
    queryKey: ["attributes", "list"],
    queryFn: () => fetchAttributesAll(),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [valuesFor, setValuesFor] = useState<Row | null>(null);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newSlugTouched, setNewSlugTouched] = useState(false);
  const [newDataType, setNewDataType] = useState("string");

  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDataType, setEditDataType] = useState("string");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");

  const [newValueText, setNewValueText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const rows = q.data ?? [];
  const loadErr = q.error ? errMsg(q.error, "Could not load attributes.") : null;

  const valuesQ = useQuery({
    queryKey: ["attributes", valuesFor?.id, "values"],
    queryFn: () => fetchAttributeValues(valuesFor!.id),
    enabled: Boolean(valuesFor?.id),
  });

  const valueRows: AttributeValueRow[] = valuesQ.data?.data ?? [];

  const createMu = useMutation({
    mutationFn: createAttribute,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attributes", "list"] });
      setAddOpen(false);
      setNewName("");
      setNewSlug("");
      setNewSlugTouched(false);
      setNewDataType("string");
      setFormError(null);
    },
    onError: (e) => setFormError(errMsg(e, "Could not create attribute.")),
  });

  const updateMu = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateAttribute>[1] }) => updateAttribute(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attributes", "list"] });
      setEditRow(null);
      setFormError(null);
    },
    onError: (e) => setFormError(errMsg(e, "Could not update attribute.")),
  });

  const deleteMu = useMutation({
    mutationFn: deleteAttribute,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attributes", "list"] });
      setFormError(null);
    },
    onError: (e) => setFormError(errMsg(e, "Could not delete attribute.")),
  });

  const addValueMu = useMutation({
    mutationFn: ({ attributeId, value, slug }: { attributeId: string; value: string; slug: string }) =>
      createAttributeValue(attributeId, { value, slug, status: "active" }),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: ["attributes", vars.attributeId, "values"] });
      void qc.invalidateQueries({ queryKey: ["attributes", "list"] });
      setNewValueText("");
      setFormError(null);
    },
    onError: (e) => setFormError(errMsg(e, "Could not add value.")),
  });

  const openEdit = useCallback((r: Row) => {
    if (!isTenantAttribute(r)) return;
    setFormError(null);
    setEditRow(r);
    setEditName(r.name);
    setEditSlug(r.slug);
    setEditDataType(r.dataType || "string");
    setEditStatus(r.status === "inactive" ? "inactive" : "active");
  }, []);

  const openValues = useCallback((r: Row) => {
    setFormError(null);
    setValuesFor(r);
    setNewValueText("");
  }, []);

  const columns: DataTableColumn<Row>[] = useMemo(
    () => [
      { id: "name", header: "Name", cell: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
      { id: "slug", header: "Slug", cell: (r) => <span className="font-mono text-xs text-slate-600">{r.slug}</span> },
      { id: "dataType", header: "Type", cell: (r) => <span className="text-xs text-slate-600">{r.dataType}</span> },
      {
        id: "scope",
        header: "Source",
        cell: (r) =>
          isTenantAttribute(r) ? (
            <Badge variant="success">Your store</Badge>
          ) : (
            <Badge variant="neutral">Platform</Badge>
          ),
      },
      { id: "status", header: "Status", cell: (r) => <Badge variant="neutral">{r.status ?? "active"}</Badge> },
      {
        id: "actions",
        header: "",
        className: "w-52 text-right",
        cell: (r) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => openValues(r)}>
              Values
            </Button>
            {isTenantAttribute(r) && !staffReadOnly ? (
              <>
                <Button type="button" variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => openEdit(r)}>
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="!px-2 !py-1 text-xs text-red-700"
                  disabled={deleteMu.isPending}
                  onClick={() => {
                    if (!window.confirm(`Delete attribute “${r.name}”?`)) return;
                    deleteMu.mutate(r.id);
                  }}
                >
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [deleteMu.isPending, openEdit, openValues, staffReadOnly],
  );

  const canAddValues = valuesFor && isTenantAttribute(valuesFor) && !staffReadOnly;

  return (
    <div>
      <PageHeader
        title="Attributes"
        description="Platform attributes are shared; create your own for store-specific options (colors, sizes, materials). Product wizard loads values from here."
        actions={
          staffReadOnly ? null : (
            <Button
              type="button"
              onClick={() => {
                setFormError(null);
                setNewName("");
                setNewSlug("");
                setNewSlugTouched(false);
                setNewDataType("string");
                setAddOpen(true);
              }}
            >
              + Add attribute
            </Button>
          )
        }
      />

      {loadErr ? <p className="mb-3 text-sm text-red-700">{loadErr}</p> : null}
      {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
      {q.isLoading ? <p className="text-sm text-slate-600">Loading…</p> : null}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
      </div>

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attr-add-title"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
            <h3 id="attr-add-title" className="text-sm font-semibold text-slate-900">
              Add attribute
            </h3>
            <p className="mt-1 text-xs text-slate-600">Creates a tenant-scoped attribute for variant options.</p>
            <div className="mt-4 space-y-3">
              <FormInput
                id="attr-add-name"
                label="Name"
                required
                value={newName}
                onChange={(e) => {
                  const v = e.target.value;
                  setNewName(v);
                  if (!newSlugTouched) setNewSlug(slugify(v));
                }}
              />
              <FormInput
                id="attr-add-slug"
                label="Slug"
                required
                value={newSlug}
                onChange={(e) => {
                  setNewSlugTouched(true);
                  setNewSlug(e.target.value);
                }}
              />
              <div>
                <label htmlFor="attr-add-dt" className="block text-xs font-medium text-slate-700">
                  Data type
                </label>
                <select
                  id="attr-add-dt"
                  value={newDataType}
                  onChange={(e) => setNewDataType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
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
                disabled={createMu.isPending || !newName.trim() || !newSlug.trim()}
                onClick={() => {
                  const name = newName.trim();
                  const sl = newSlug.trim();
                  if (!name || !sl) return;
                  createMu.mutate({
                    name,
                    slug: sl,
                    dataType: newDataType,
                    status: "active",
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
          aria-labelledby="attr-edit-title"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
            <h3 id="attr-edit-title" className="text-sm font-semibold text-slate-900">
              Edit attribute
            </h3>
            <div className="mt-4 space-y-3">
              <FormInput id="attr-edit-name" label="Name" required value={editName} onChange={(e) => setEditName(e.target.value)} />
              <FormInput id="attr-edit-slug" label="Slug" required value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
              <div>
                <label htmlFor="attr-edit-dt" className="block text-xs font-medium text-slate-700">
                  Data type
                </label>
                <select
                  id="attr-edit-dt"
                  value={editDataType}
                  onChange={(e) => setEditDataType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                </select>
              </div>
              <div>
                <label htmlFor="attr-edit-status" className="block text-xs font-medium text-slate-700">
                  Status
                </label>
                <select
                  id="attr-edit-status"
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
                  updateMu.mutate({
                    id: editRow.id,
                    body: {
                      name: editName.trim(),
                      slug: editSlug.trim(),
                      dataType: editDataType,
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

      {valuesFor ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attr-values-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
            <h3 id="attr-values-title" className="text-sm font-semibold text-slate-900">
              Values — {valuesFor.name}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {isTenantAttribute(valuesFor)
                ? "Allowed option labels used when building product variants."
                : "Platform attribute — values are read-only here; contact support if something is missing."}
            </p>
            {valuesQ.isLoading ? <p className="mt-3 text-sm text-slate-600">Loading values…</p> : null}
            {valuesQ.error ? (
              <p className="mt-3 text-sm text-red-700">{errMsg(valuesQ.error, "Could not load values.")}</p>
            ) : null}
            <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto rounded border border-slate-100 bg-slate-50/80 p-2 text-sm">
              {valueRows.length ? (
                valueRows.map((v) => (
                  <li key={v.id} className="flex justify-between gap-2 rounded bg-white px-2 py-1.5 shadow-sm">
                    <span>{v.value}</span>
                    <span className="font-mono text-[11px] text-slate-500">{v.slug}</span>
                  </li>
                ))
              ) : !valuesQ.isLoading ? (
                <li className="px-2 py-2 text-slate-500">No values yet.</li>
              ) : null}
            </ul>
            {canAddValues ? (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <FormInput
                  id="attr-new-value"
                  label="New value"
                  value={newValueText}
                  onChange={(e) => setNewValueText(e.target.value)}
                  placeholder="e.g. Rose Gold"
                />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={addValueMu.isPending || !newValueText.trim()}
                    onClick={() => {
                      const raw = newValueText.trim();
                      if (!raw) return;
                      const sl = slugify(raw) || "value";
                      addValueMu.mutate({ attributeId: valuesFor.id, value: raw, slug: sl });
                    }}
                  >
                    {addValueMu.isPending ? "Adding…" : "Add value"}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setValuesFor(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
