import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { ApiError } from '@/lib/apiClient';
import { fetchAdCampaigns, fetchAdsAnalytics } from '@/lib/adsApi';

export function AdsDashboardPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCampaigns, setActiveCampaigns] = useState(0);
  const [impressions, setImpressions] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [conversions, setConversions] = useState(0);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [campaigns, analytics] = await Promise.all([fetchAdCampaigns(), fetchAdsAnalytics()]);
      const active = campaigns.filter((c) => c.status.toUpperCase() === 'ACTIVE').length;
      setActiveCampaigns(active);
      setImpressions(analytics.totals.impressions);
      setClicks(analytics.totals.clicks);
      setConversions(analytics.totals.conversions);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ctr = useMemo(
    () => (impressions > 0 ? (clicks / impressions) * 100 : 0),
    [impressions, clicks],
  );

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {error}
        </div>
      ) : null}
      <ResourcePanel title={loading ? 'Overview (loading…)' : 'Overview'}>
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Active campaigns</div>
            <div className="text-xl font-semibold tabular-nums">{activeCampaigns}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Impressions</div>
            <div className="text-xl font-semibold tabular-nums">{impressions.toLocaleString()}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Clicks</div>
            <div className="text-xl font-semibold tabular-nums">{clicks.toLocaleString()}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">CTR</div>
            <div className="text-xl font-semibold tabular-nums">{ctr.toFixed(1)}%</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Conversions</div>
            <div className="text-xl font-semibold tabular-nums">{conversions.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">Revenue not tracked yet</div>
          </div>
        </div>
      </ResourcePanel>
      <p className="text-xs text-slate-500">
        Sourced from <span className="font-mono">/ads/campaigns</span> and <span className="font-mono">/ads/analytics</span>.
        Platform rule: <strong>free plan</strong> tenants see ads; paid plans do not.
      </p>
    </div>
  );
}
