import { useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";
import type { ApiEnvelope } from "@/lib/apiTypes";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ResourcePanel } from "@/components/ui/ResourcePanel";

type ConversionRow = {
  id: string;
  referredTenantId: string;
  status: string;
  subscriptionId: string | null;
  fraudFlag: boolean;
  createdAt: string;
};

export function ReferralsConversionsPage() {
  const [rows, setRows] = useState<ConversionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<ApiEnvelope<ConversionRow[]>>("/referrals/conversions");
        if (!cancelled) setRows(res.data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load conversions.";
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
      <PageHeader title="Conversions" />
      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : (
        <ResourcePanel title="All conversions">
          <DataTable
            columns={[
              { id: "tenant", header: "Referred tenant", cell: (r) => r.referredTenantId },
              { id: "status", header: "Status", cell: (r) => r.status },
              {
                id: "fraud",
                header: "Fraud flag",
                cell: (r) => (r.fraudFlag ? "Yes" : "No"),
              },
              {
                id: "created",
                header: "Created",
                cell: (r) => new Date(r.createdAt).toLocaleString(),
              },
            ]}
            rows={rows}
            rowKey={(r) => r.id}
          />
        </ResourcePanel>
      )}
    </div>
  );
}
