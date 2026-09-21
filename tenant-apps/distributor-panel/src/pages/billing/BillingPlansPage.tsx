import { useEffect, useState } from "react";
import { ApiError, apiGet } from "@/lib/apiClient";
import type { ApiEnvelope } from "@/lib/apiTypes";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ResourcePanel } from "@/components/ui/ResourcePanel";

type PlanRow = {
  id: string;
  code: string;
  name: string;
  price: number;
  billingCycle: string;
};

export function BillingPlansPage() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<ApiEnvelope<PlanRow[]>>("/billing/plans");
        if (!cancelled) setRows(res.data);
      } catch (e) {
        const msg =
          e instanceof ApiError && e.status === 403
            ? "Your role cannot list plans (owner or manager required)."
            : e instanceof Error
              ? e.message
              : "Failed to load plans.";
        if (!cancelled) {
          setError(msg);
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <PageHeader title="Plans" description="Active platform plans (subscribe via API or Super Admin flows)." />
      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : (
        <ResourcePanel title="Available plans">
          <DataTable
            columns={[
              { id: "code", header: "Code", cell: (r) => r.code },
              { id: "name", header: "Name", cell: (r) => r.name },
              {
                id: "price",
                header: "Price",
                cell: (r) => <span className="tabular-nums">{r.price}</span>,
              },
              { id: "cycle", header: "Cycle", cell: (r) => r.billingCycle },
            ]}
            rows={rows}
            rowKey={(r) => r.id}
          />
        </ResourcePanel>
      )}
    </div>
  );
}
