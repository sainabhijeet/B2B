import { useEffect, useState } from "react";
import { ApiError, apiGet } from "@/lib/apiClient";
import type { ApiEnvelope } from "@/lib/apiTypes";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourcePanel } from "@/components/ui/ResourcePanel";

type SubscriptionRow = {
  id: string;
  tenantId: string;
  planName: string;
  planId: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  expiryDate: string | null;
};

export function BillingSubscriptionPage() {
  const [data, setData] = useState<SubscriptionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<ApiEnvelope<SubscriptionRow>>("/billing/subscription");
        if (!cancelled) setData(res.data);
      } catch (e) {
        const msg =
          e instanceof ApiError && e.status === 404
            ? "No subscription record for this tenant yet."
            : e instanceof Error
              ? e.message
              : "Failed to load subscription.";
        if (!cancelled) {
          setError(msg);
          setData(null);
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
      <PageHeader title="Current subscription" />
      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : data ? (
        <ResourcePanel title="Subscription">
          <dl className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Plan</dt>
              <dd className="font-medium text-slate-900">{data.planName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Status</dt>
              <dd className="text-slate-800">{data.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Start</dt>
              <dd className="text-slate-800">{data.startDate}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-500">Expiry</dt>
              <dd className="text-slate-800">{data.expiryDate ?? data.endDate ?? "—"}</dd>
            </div>
          </dl>
        </ResourcePanel>
      ) : null}
    </div>
  );
}
