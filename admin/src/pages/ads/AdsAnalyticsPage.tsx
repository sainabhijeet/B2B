import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { fetchAdsAnalytics } from '@/lib/adsApi';
import type { AdsAnalyticsPayload } from '@/lib/adsApi';

export function AdsAnalyticsPage() {
  const [data, setData] = useState<AdsAnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setData(await fetchAdsAnalytics());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load analytics.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ctr = useMemo(() => {
    if (!data || data.totals.impressions <= 0) return 0;
    return (data.totals.clicks / data.totals.impressions) * 100;
  }, [data]);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {error}
        </div>
      ) : null}
      <ResourcePanel
        title={loading ? 'Performance overview (loading…)' : 'Performance overview'}
        toolbar={
          <button type="button" className={adminBtnSecondary} onClick={() => void load()}>
            Refresh
          </button>
        }
      >
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Impressions</div>
            <div className="text-xl font-semibold tabular-nums">
              {(data?.totals.impressions ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Clicks</div>
            <div className="text-xl font-semibold tabular-nums">
              {(data?.totals.clicks ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">CTR</div>
            <div className="text-xl font-semibold tabular-nums">{ctr.toFixed(1)}%</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Conversions</div>
            <div className="text-xl font-semibold tabular-nums">
              {(data?.totals.conversions ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </ResourcePanel>

      <ResourcePanel title="Daily trend">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-500">
                  Date
                </th>
                <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-500">
                  Impressions
                </th>
                <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-500">
                  Clicks
                </th>
                <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase text-slate-500">
                  CTR
                </th>
              </tr>
            </thead>
            <tbody>
              {(data?.series ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    No stats yet (views/clicks recorded via tenant <span className="font-mono">POST /ads/events</span>).
                  </td>
                </tr>
              ) : (
                data!.series.map((row) => {
                  const rowCtr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
                  const dateLabel =
                    typeof row.date === 'string'
                      ? row.date.slice(0, 10)
                      : String(row.date);
                  return (
                    <tr key={dateLabel} className="border-b border-slate-100">
                      <td className="px-3 py-2">{dateLabel}</td>
                      <td className="px-3 py-2 tabular-nums">{row.impressions.toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums">{row.clicks.toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums">{rowCtr.toFixed(2)}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </ResourcePanel>
    </div>
  );
}
