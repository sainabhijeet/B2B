import { useEffect, useState } from "react";
import { apiGet } from "@/lib/apiClient";
import type { ApiEnvelope } from "@/lib/apiTypes";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourcePanel } from "@/components/ui/ResourcePanel";

type ReferralCodeRow = {
  id: string;
  userId: string;
  code: string;
  status: string;
  createdAt: string;
};

export function ReferralsCodePage() {
  const [data, setData] = useState<ReferralCodeRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet<ApiEnvelope<ReferralCodeRow>>("/referrals/code");
        if (!cancelled) setData(res.data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load referral code.";
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
      <PageHeader title="Your referral code" />
      {loading ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : data ? (
        <ResourcePanel title="Code">
          <div className="px-3 py-4">
            <p className="font-mono text-lg font-semibold tracking-wide text-slate-900">{data.code}</p>
            <p className="mt-1 text-xs text-slate-500">Status: {data.status}</p>
          </div>
        </ResourcePanel>
      ) : null}
    </div>
  );
}
