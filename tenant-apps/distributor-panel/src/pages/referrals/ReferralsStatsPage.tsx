import { useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";
import type { ApiEnvelope } from "@/lib/apiTypes";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlaceholderCard } from "@/components/ui/PlaceholderCard";

type Stats = {
  total_referrals: number;
  active_subscriptions: number;
  commission_earned: number;
};

export function ReferralsStatsPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<ApiEnvelope<Stats>>("/referrals/stats");
        if (!cancelled) setData(res.data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load stats.";
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
      <PageHeader title="Referral stats" />
      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <PlaceholderCard title="Total referrals">
            <span className="text-lg font-semibold tabular-nums text-slate-900">{data.total_referrals}</span>
          </PlaceholderCard>
          <PlaceholderCard title="Active subscriptions">
            <span className="text-lg font-semibold tabular-nums text-slate-900">
              {data.active_subscriptions}
            </span>
          </PlaceholderCard>
          <PlaceholderCard title="Commission earned (paid)">
            <span className="text-lg font-semibold tabular-nums text-slate-900">
              {data.commission_earned}
            </span>
          </PlaceholderCard>
        </div>
      ) : null}
    </div>
  );
}
