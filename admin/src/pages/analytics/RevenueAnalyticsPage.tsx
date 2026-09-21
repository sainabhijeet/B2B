import { useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { MiniBarChart, PlanPieLegend } from '@/components/analytics/charts';
import { fetchAdminData, type ChartPoint } from '@/lib/adminConsoleApi';

type RevenueAnalytics = {
  monthlyInr: number;
  annualInr: number;
  renewalRatePercent: number;
  planFreePercent: number;
  planBasicPercent: number;
  planPremiumPercent: number;
};
type RevenueState = { analytics: RevenueAnalytics; growthSeries: ChartPoint[] };

const EMPTY_REVENUE: RevenueState = {
  analytics: {
    monthlyInr: 0,
    annualInr: 0,
    renewalRatePercent: 0,
    planFreePercent: 0,
    planBasicPercent: 0,
    planPremiumPercent: 0,
  },
  growthSeries: [],
};

function inr(n: number) {
  return `Rs ${n.toLocaleString('en-IN')}`;
}

export function RevenueAnalyticsPage() {
  const [state, setState] = useState<RevenueState>(EMPTY_REVENUE);

  useEffect(() => {
    let alive = true;
    fetchAdminData<RevenueState>('/admin/analytics/revenue')
      .then((data) => {
        if (alive) setState(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const r = state.analytics;
  const segments = [
    { label: 'Free users', percent: r.planFreePercent, color: 'bg-slate-400', fill: '#94a3b8' },
    { label: 'Basic', percent: r.planBasicPercent, color: 'bg-emerald-500', fill: '#22c55e' },
    { label: 'Premium', percent: r.planPremiumPercent, color: 'bg-amber-500', fill: '#f59e0b' },
  ];
  return (
    <div className="space-y-4">
      <ResourcePanel title="Revenue metrics">
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Monthly revenue</div>
            <div className="text-lg font-semibold tabular-nums">{inr(r.monthlyInr)}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Annual revenue</div>
            <div className="text-lg font-semibold tabular-nums">{inr(r.annualInr)}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Renewal rate</div>
            <div className="text-lg font-semibold tabular-nums">{r.renewalRatePercent}%</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Plan mix</div>
            <div className="text-xs text-slate-600">
              Free {r.planFreePercent}% - Basic {r.planBasicPercent}% - Premium {r.planPremiumPercent}%
            </div>
          </div>
        </div>
      </ResourcePanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResourcePanel title="Revenue growth">
          <div className="p-3">
            <MiniBarChart
              series={state.growthSeries}
              colorClass="bg-indigo-600"
              formatValue={(n) => inr(n * 1000)}
            />
          </div>
        </ResourcePanel>
        <ResourcePanel title="Plan distribution">
          <div className="p-3">
            <PlanPieLegend segments={segments} />
            <p className="mt-3 text-[10px] text-slate-500">
              Stripe / ledger export should drive live slices; ring is a simplified conic preview.
            </p>
          </div>
        </ResourcePanel>
      </div>
    </div>
  );
}
