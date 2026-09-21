import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { MiniBarChart } from '@/components/analytics/charts';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import type { ChartPoint } from '@/lib/adminConsoleApi';
import { apiGet } from '@/lib/apiClient';

type AdsAnalyticsSnapshot = {
  impressions: number;
  clicks: number;
  ctrPercent: number;
  revenueFromAdsInr: number;
};
type AdsAnalyticsState = {
  snapshot: AdsAnalyticsSnapshot;
  ctrSeries: ChartPoint[];
};

const EMPTY_ADS_ANALYTICS: AdsAnalyticsState = {
  snapshot: {
    impressions: 0,
    clicks: 0,
    ctrPercent: 0,
    revenueFromAdsInr: 0,
  },
  ctrSeries: [],
};

export function AdsAnalyticsSummaryPage() {
  const [state, setState] = useState<AdsAnalyticsState>(EMPTY_ADS_ANALYTICS);

  useEffect(() => {
    let alive = true;
    apiGet<{
      data: {
        totals: { impressions: number; clicks: number };
        series: Array<{ date: string; impressions: number; clicks: number }>;
      };
    }>('/ads/analytics')
      .then(({ data }) => {
        const impressions = data.totals.impressions;
        const clicks = data.totals.clicks;
        if (alive) setState({
          snapshot: {
            impressions,
            clicks,
            ctrPercent: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
            revenueFromAdsInr: 0,
          },
          ctrSeries: data.series.map((point) => ({
            label: point.date,
            value: point.impressions
              ? Number(((point.clicks / point.impressions) * 100).toFixed(2))
              : 0,
          })),
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const a = state.snapshot;
  return (
    <div className="space-y-4">
      <ResourcePanel
        title="Ad performance (summary)"
        toolbar={
          <Link to="/ads/analytics" className={adminBtnSecondary}>
            Open Ads Manager analytics
          </Link>
        }
      >
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Impressions</div>
            <div className="text-xl font-semibold tabular-nums">{a.impressions.toLocaleString()}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Clicks</div>
            <div className="text-xl font-semibold tabular-nums">{a.clicks.toLocaleString()}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">CTR</div>
            <div className="text-xl font-semibold tabular-nums">{a.ctrPercent}%</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Revenue from ads</div>
            <div className="text-xl font-semibold tabular-nums">
              Rs {a.revenueFromAdsInr.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500">Attributed</div>
          </div>
        </div>
      </ResourcePanel>
      <ResourcePanel title="CTR trend (%)">
        <div className="p-3">
          <MiniBarChart
            series={state.ctrSeries}
            colorClass="bg-orange-500"
            formatValue={(n) => `${n}%`}
          />
        </div>
      </ResourcePanel>
    </div>
  );
}
