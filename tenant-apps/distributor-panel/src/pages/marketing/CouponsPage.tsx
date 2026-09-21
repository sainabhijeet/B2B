import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power, Save, Trash2, X } from "lucide-react";
import {
  createCoupon,
  deleteCoupon,
  fetchCoupons,
  updateCoupon,
  type CouponInput,
  type CouponRow,
} from "@/api/couponsApi";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError } from "@/lib/apiClient";

type CouponForm = {
  code: string;
  name: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minimumOrderAmount: string;
  maximumDiscountAmount: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perCustomerLimit: string;
  active: boolean;
};

const emptyForm: CouponForm = {
  code: "",
  name: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minimumOrderAmount: "0",
  maximumDiscountAmount: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  perCustomerLimit: "1",
  active: true,
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100";

function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function toForm(row: CouponRow): CouponForm {
  return {
    code: row.code,
    name: row.name,
    discountType: row.discountType,
    discountValue: row.discountValue,
    minimumOrderAmount: row.minimumOrderAmount,
    maximumDiscountAmount: row.maximumDiscountAmount ?? "",
    startsAt: localDateTime(row.startsAt),
    endsAt: localDateTime(row.endsAt),
    usageLimit: row.usageLimit?.toString() ?? "",
    perCustomerLimit: row.perCustomerLimit.toString(),
    active: row.active,
  };
}

function payload(form: CouponForm): CouponInput {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minimumOrderAmount: Number(form.minimumOrderAmount || 0),
    maximumDiscountAmount:
      form.discountType === "PERCENTAGE" && form.maximumDiscountAmount
        ? Number(form.maximumDiscountAmount)
        : null,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
    perCustomerLimit: Number(form.perCustomerLimit),
    active: form.active,
  };
}

function money(value: string | null): string {
  return value == null ? "No cap" : `INR ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function CouponsPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["coupons"], queryFn: fetchCoupons });
  const saveMutation = useMutation({
    mutationFn: (input: CouponInput) =>
      editingId ? updateCoupon(editingId, input) : createCoupon(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setMessage(editingId ? "Coupon updated." : "Coupon created.");
      closeForm();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setMessage(result.archived ? "Used coupon archived." : "Coupon deleted.");
    },
  });
  const toggleMutation = useMutation({
    mutationFn: (row: CouponRow) => updateCoupon(row.id, { ...payload(toForm(row)), active: !row.active }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["coupons"] }),
  });

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function edit(row: CouponRow) {
    setEditingId(row.id);
    setForm(toForm(row));
    setShowForm(true);
    setMessage(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    saveMutation.mutate(payload(form));
  }

  const error = saveMutation.error ?? deleteMutation.error ?? toggleMutation.error ?? query.error;
  const errorText = error instanceof ApiError ? error.message : error ? "Coupon operation failed." : null;
  const busy = saveMutation.isPending || deleteMutation.isPending || toggleMutation.isPending;

  const columns: DataTableColumn<CouponRow>[] = useMemo(
    () => [
      {
        id: "coupon",
        header: "Coupon",
        cell: (row) => (
          <div>
            <div className="font-mono text-xs font-semibold text-slate-900">{row.code}</div>
            <div className="mt-0.5 text-xs text-slate-500">{row.name}</div>
          </div>
        ),
      },
      {
        id: "discount",
        header: "Discount",
        cell: (row) => (
          <span className="font-medium">
            {row.discountType === "PERCENTAGE" ? `${Number(row.discountValue)}%` : money(row.discountValue)}
          </span>
        ),
      },
      { id: "minimum", header: "Minimum order", cell: (row) => money(row.minimumOrderAmount) },
      {
        id: "usage",
        header: "Usage",
        cell: (row) => `${row.usedCount} / ${row.usageLimit ?? "Unlimited"}`,
      },
      {
        id: "validity",
        header: "Ends",
        cell: (row) => row.endsAt ? new Date(row.endsAt).toLocaleDateString("en-IN") : "No expiry",
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => <Badge variant={row.active ? "success" : "neutral"}>{row.active ? "Active" : "Inactive"}</Badge>,
      },
      {
        id: "actions",
        header: "Actions",
        className: "w-32",
        cell: (row) => (
          <div className="flex items-center gap-1">
            <button type="button" title="Edit coupon" aria-label={`Edit ${row.code}`} onClick={() => edit(row)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100">
              <Pencil className="h-4 w-4" />
            </button>
            <button type="button" title={row.active ? "Disable coupon" : "Enable coupon"} aria-label={`${row.active ? "Disable" : "Enable"} ${row.code}`} onClick={() => toggleMutation.mutate(row)} disabled={busy} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              <Power className="h-4 w-4" />
            </button>
            <button type="button" title="Delete coupon" aria-label={`Delete ${row.code}`} onClick={() => window.confirm(`Delete coupon ${row.code}?`) && deleteMutation.mutate(row.id)} disabled={busy} className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-50">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [busy, deleteMutation, toggleMutation],
  );

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Promotions applied and audited during checkout."
        actions={
          !showForm ? (
            <Button onClick={() => { setShowForm(true); setMessage(null); }}>
              <Plus className="h-4 w-4" /> New coupon
            </Button>
          ) : undefined
        }
      />

      {errorText ? <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{errorText}</p> : null}
      {message ? <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</p> : null}

      {showForm ? (
        <form onSubmit={submit} className="mb-5 border-y border-slate-200 bg-white px-4 py-5 sm:border sm:rounded-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">{editingId ? "Edit coupon" : "Create coupon"}</h2>
            <button type="button" title="Close" aria-label="Close coupon form" onClick={closeForm} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-medium text-slate-700">Code *
              <input className={`${inputClass} font-mono uppercase`} required minLength={3} maxLength={40} disabled={Boolean(editingId)} value={form.code} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value.replace(/[^a-z0-9_-]/gi, "").toUpperCase() }))} />
            </label>
            <label className="text-xs font-medium text-slate-700 sm:col-span-2">Name *
              <input className={inputClass} required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </label>
            <label className="text-xs font-medium text-slate-700">Type *
              <select className={inputClass} value={form.discountType} onChange={(e) => setForm((s) => ({ ...s, discountType: e.target.value as CouponForm["discountType"], maximumDiscountAmount: "" }))}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed amount</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">Discount value *
              <input className={inputClass} required type="number" min="0.01" max={form.discountType === "PERCENTAGE" ? "100" : undefined} step="0.01" value={form.discountValue} onChange={(e) => setForm((s) => ({ ...s, discountValue: e.target.value }))} />
            </label>
            <label className="text-xs font-medium text-slate-700">Minimum order
              <input className={inputClass} type="number" min="0" step="0.01" value={form.minimumOrderAmount} onChange={(e) => setForm((s) => ({ ...s, minimumOrderAmount: e.target.value }))} />
            </label>
            <label className="text-xs font-medium text-slate-700">Maximum discount
              <input className={inputClass} disabled={form.discountType === "FIXED"} type="number" min="0.01" step="0.01" value={form.maximumDiscountAmount} onChange={(e) => setForm((s) => ({ ...s, maximumDiscountAmount: e.target.value }))} />
            </label>
            <label className="text-xs font-medium text-slate-700">Total usage limit
              <input className={inputClass} type="number" min="1" step="1" value={form.usageLimit} onChange={(e) => setForm((s) => ({ ...s, usageLimit: e.target.value }))} />
            </label>
            <label className="text-xs font-medium text-slate-700">Per customer limit *
              <input className={inputClass} required type="number" min="1" max="1000" step="1" value={form.perCustomerLimit} onChange={(e) => setForm((s) => ({ ...s, perCustomerLimit: e.target.value }))} />
            </label>
            <label className="text-xs font-medium text-slate-700">Starts at
              <input className={inputClass} type="datetime-local" value={form.startsAt} onChange={(e) => setForm((s) => ({ ...s, startsAt: e.target.value }))} />
            </label>
            <label className="text-xs font-medium text-slate-700">Ends at
              <input className={inputClass} type="datetime-local" min={form.startsAt || undefined} value={form.endsAt} onChange={(e) => setForm((s) => ({ ...s, endsAt: e.target.value }))} />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((s) => ({ ...s, active: e.target.checked }))} className="h-4 w-4 accent-emerald-600" /> Active
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={closeForm}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save coupon"}
            </Button>
          </div>
        </form>
      ) : null}

      {query.isLoading ? <p className="text-sm text-slate-600">Loading...</p> : null}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <DataTable columns={columns} rows={query.data ?? []} rowKey={(row) => row.id} />
      </div>
    </div>
  );
}
