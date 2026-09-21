import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import {
  deleteCustomer,
  fetchCreditLedger,
  fetchCustomer,
  patchCustomerWhatsappPermissions,
  postCreditAddLimit,
  postCreditAdjust,
  postCreditPayment,
  postCreditWriteOff,
} from "@/api/customersApi";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/apiClient";
import type { CreditLedgerRow, CustomerAddressRow, CustomerWhatsappPermissionsRow } from "@/types/commerce";

function formatInr(amount: string): string {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return amount;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customerId = id ?? "";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { staffReadOnly } = useAuth();
  const [ledgerPage, setLedgerPage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  const [adjustType, setAdjustType] = useState<"ADJUSTMENT_DEBIT" | "ADJUSTMENT_CREDIT">("ADJUSTMENT_DEBIT");
  const [adjustMag, setAdjustMag] = useState("");
  const [payAmt, setPayAmt] = useState("");
  const [writeAmt, setWriteAmt] = useState("");
  const [limitAdd, setLimitAdd] = useState("");

  const defaultWa: Omit<CustomerWhatsappPermissionsRow, "customerId" | "tenantId"> = {
    canViewStatus: true,
    canViewInvoice: true,
    canPlaceOrder: false,
    canRepeatOrder: false,
    canViewCredit: false,
    canReceiveBroadcast: false,
  };
  const [waFlags, setWaFlags] = useState(defaultWa);

  const customerQ = useQuery({
    queryKey: ["distributor", "customers", customerId],
    queryFn: () => fetchCustomer(customerId),
    enabled: Boolean(customerId),
  });

  const ledgerQ = useQuery({
    queryKey: ["distributor", "customers", customerId, "ledger", ledgerPage],
    queryFn: () => fetchCreditLedger(customerId, { page: ledgerPage, limit: 20 }),
    enabled: Boolean(customerId),
  });

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["distributor", "customers"] });
    void qc.invalidateQueries({ queryKey: ["distributor", "customers", customerId] });
    void qc.invalidateQueries({ queryKey: ["distributor", "customers", customerId, "ledger"] });
  }, [qc, customerId]);

  const adjustMut = useMutation({
    mutationFn: () => postCreditAdjust(customerId, { entryType: adjustType, magnitude: adjustMag.trim() }),
    onSuccess: () => {
      setAdjustMag("");
      invalidate();
    },
    onError: (e: unknown) => setFormError(e instanceof ApiError ? e.message : "Adjustment failed."),
  });

  const payMut = useMutation({
    mutationFn: () => postCreditPayment(customerId, payAmt.trim()),
    onSuccess: () => {
      setPayAmt("");
      invalidate();
    },
    onError: (e: unknown) => setFormError(e instanceof ApiError ? e.message : "Payment failed."),
  });

  const writeMut = useMutation({
    mutationFn: () => postCreditWriteOff(customerId, writeAmt.trim()),
    onSuccess: () => {
      setWriteAmt("");
      invalidate();
    },
    onError: (e: unknown) => setFormError(e instanceof ApiError ? e.message : "Write-off failed."),
  });

  const limitMut = useMutation({
    mutationFn: () => postCreditAddLimit(customerId, limitAdd.trim()),
    onSuccess: () => {
      setLimitAdd("");
      invalidate();
    },
    onError: (e: unknown) => setFormError(e instanceof ApiError ? e.message : "Could not add limit."),
  });

  const waMut = useMutation({
    mutationFn: () => patchCustomerWhatsappPermissions(customerId, waFlags),
    onSuccess: () => {
      invalidate();
    },
    onError: (e: unknown) => setFormError(e instanceof ApiError ? e.message : "WhatsApp permissions update failed."),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteCustomer(customerId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["distributor", "customers"] });
    },
    onError: (e: unknown) => setFormError(e instanceof ApiError ? e.message : "Delete failed."),
  });

  const c = customerQ.data?.data;

  const syncWaFromCustomer = useCallback(() => {
    const p = c?.whatsappPermissions;
    if (p) {
      setWaFlags({
        canViewStatus: p.canViewStatus,
        canViewInvoice: p.canViewInvoice,
        canPlaceOrder: p.canPlaceOrder,
        canRepeatOrder: p.canRepeatOrder,
        canViewCredit: p.canViewCredit,
        canReceiveBroadcast: p.canReceiveBroadcast,
      });
    }
  }, [c?.whatsappPermissions]);

  useEffect(() => {
    syncWaFromCustomer();
  }, [syncWaFromCustomer, customerId]);
  const ledgerRows = ledgerQ.data?.data ?? [];
  const ledgerMeta = ledgerQ.data?.meta;

  const ledgerColumns: DataTableColumn<CreditLedgerRow>[] = useMemo(
    () => [
      {
        id: "at",
        header: "Date",
        cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"),
      },
      { id: "type", header: "Type", cell: (r) => <span className="font-mono text-xs">{r.type}</span> },
      { id: "amt", header: "Amount", cell: (r) => formatInr(r.amount) },
      { id: "ref", header: "Reference", cell: (r) => `${r.referenceType}${r.referenceId ? ` · ${r.referenceId.slice(0, 8)}…` : ""}` },
      { id: "bal", header: "Balance after", cell: (r) => formatInr(r.balanceAfter) },
    ],
    [],
  );

  if (!customerId) return <p className="text-sm text-slate-600">Missing customer id.</p>;

  return (
    <div>
      <div className="mb-4">
        <Link to="/customers" className="text-sm font-medium text-emerald-700 hover:underline">
          ← Customers
        </Link>
      </div>
      <PageHeader title={c?.name ?? "Customer"} description="Credit ledger and balance tools use Nest `customers` APIs." />

      {formError ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</div>
      ) : null}

      {customerQ.isLoading ? <p className="text-sm text-slate-600">Loading…</p> : null}
      {customerQ.error ? (
        <p className="text-sm text-red-600">
          {customerQ.error instanceof ApiError ? customerQ.error.message : "Failed to load customer."}
        </p>
      ) : null}

      {c ? (
        <>
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Mobile</dt>
                <dd className="font-medium text-slate-900">{c.mobile}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Email</dt>
                <dd className="text-slate-800">{c.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Credit limit</dt>
                <dd className="font-medium text-slate-900">{formatInr(c.creditLimit)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Outstanding</dt>
                <dd className="font-medium text-slate-900">{formatInr(c.creditBalance)}</dd>
              </div>
            </dl>
            {c.addresses && c.addresses.length > 0 ? (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase text-slate-500">Addresses</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {(c.addresses as CustomerAddressRow[]).map((a) => (
                    <li key={a.id} className="rounded border border-slate-100 px-2 py-1.5">
                      {a.line1}, {a.city} {a.pincode}
                      {a.isDefault ? <span className="ml-2 text-xs text-emerald-700">(default)</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">WhatsApp access</h2>
            <p className="mt-1 text-xs text-slate-500">
              Controls which reply buttons and flows this customer sees on WhatsApp. Defaults: status + invoice on;
              ordering off until you enable.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {(
                [
                  ["canViewStatus", "View order status"],
                  ["canViewInvoice", "View invoice"],
                  ["canPlaceOrder", "Place order (catalog / smart reorder)"],
                  ["canRepeatOrder", "Repeat last order"],
                  ["canViewCredit", "View credit (balance & limit)"],
                  ["canReceiveBroadcast", "Receive broadcasts (future)"],
                ] as const
              ).map(([key, label]) => (
                <li key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`wa-${key}`}
                    className="h-4 w-4 rounded border-slate-300"
                    checked={waFlags[key]}
                    disabled={staffReadOnly}
                    onChange={(e) => setWaFlags((f) => ({ ...f, [key]: e.target.checked }))}
                  />
                  <label htmlFor={`wa-${key}`} className="text-slate-800">
                    {label}
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                disabled={staffReadOnly || waMut.isPending}
                onClick={() => {
                  setFormError(null);
                  waMut.mutate();
                }}
              >
                Save WhatsApp permissions
              </Button>
            </div>
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Credit adjustment</h3>
              <p className="mt-1 text-xs text-slate-500">POST /customers/:id/credit-adjust</p>
              <div className="mt-3 space-y-2">
                <select
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as typeof adjustType)}
                  disabled={staffReadOnly}
                >
                  <option value="ADJUSTMENT_DEBIT">Adjustment debit (increase owed)</option>
                  <option value="ADJUSTMENT_CREDIT">Adjustment credit (reduce owed)</option>
                </select>
                <input
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  placeholder="Amount e.g. 100.50"
                  value={adjustMag}
                  onChange={(e) => setAdjustMag(e.target.value)}
                  disabled={staffReadOnly}
                />
                <Button
                  type="button"
                  disabled={staffReadOnly || adjustMut.isPending || !adjustMag.trim()}
                  onClick={() => {
                    setFormError(null);
                    adjustMut.mutate();
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Payment received</h3>
              <p className="mt-1 text-xs text-slate-500">POST /customers/:id/credit/pay</p>
              <div className="mt-3 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  placeholder="Amount"
                  value={payAmt}
                  onChange={(e) => setPayAmt(e.target.value)}
                  disabled={staffReadOnly}
                />
                <Button
                  type="button"
                  disabled={staffReadOnly || payMut.isPending || !payAmt.trim()}
                  onClick={() => {
                    setFormError(null);
                    payMut.mutate();
                  }}
                >
                  Record
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Write-off</h3>
              <p className="mt-1 text-xs text-slate-500">POST /customers/:id/credit-write-off (OWNER+)</p>
              <div className="mt-3 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  placeholder="Amount"
                  value={writeAmt}
                  onChange={(e) => setWriteAmt(e.target.value)}
                  disabled={staffReadOnly}
                />
                <Button
                  type="button"
                  variant="danger"
                  disabled={staffReadOnly || writeMut.isPending || !writeAmt.trim()}
                  onClick={() => {
                    setFormError(null);
                    writeMut.mutate();
                  }}
                >
                  Write off
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Increase credit limit</h3>
              <p className="mt-1 text-xs text-slate-500">POST /customers/:id/credit/add</p>
              <div className="mt-3 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  placeholder="Add ₹ to limit"
                  value={limitAdd}
                  onChange={(e) => setLimitAdd(e.target.value)}
                  disabled={staffReadOnly}
                />
                <Button
                  type="button"
                  disabled={staffReadOnly || limitMut.isPending || !limitAdd.trim()}
                  onClick={() => {
                    setFormError(null);
                    limitMut.mutate();
                  }}
                >
                  Add limit
                </Button>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h2 className="text-sm font-semibold text-slate-900">Credit ledger</h2>
            <p className="text-xs text-slate-500">GET /customers/:id/credit-ledger</p>
            <div className="mt-2">
              <DataTable columns={ledgerColumns} rows={ledgerRows} rowKey={(r) => r.id} />
            </div>
            {ledgerMeta && ledgerMeta.total_pages > 1 ? (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  Page {ledgerPage} / {ledgerMeta.total_pages}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={ledgerPage <= 1}
                    onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={ledgerPage >= ledgerMeta.total_pages}
                    onClick={() => setLedgerPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <Button
              type="button"
              variant="danger"
              disabled={staffReadOnly || deleteMut.isPending}
              onClick={() => {
                if (!window.confirm("Soft-delete this customer?")) return;
                setFormError(null);
                deleteMut.mutate(undefined, {
                  onSuccess: () => {
                    void navigate("/customers");
                  },
                });
              }}
            >
              Delete customer
            </Button>
          </section>
        </>
      ) : null}
    </div>
  );
}
