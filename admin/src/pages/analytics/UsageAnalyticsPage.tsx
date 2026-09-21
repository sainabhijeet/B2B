import { useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { MiniBarChart, SparkLine } from '@/components/analytics/charts';
import { fetchAdminData, type ChartPoint } from '@/lib/adminConsoleApi';

type UsageSnapshot = {
  apiRequestsToday: number;
  apiRequestsWeek: number;
  storageUsedTb: number;
  storageLimitTb: number;
  notificationsSentToday: number;
  activeUsers: number;
};
type UsageAnalyticsState = {
  snapshot: UsageSnapshot;
  apiUsageSeries: ChartPoint[];
  storageGrowthSeries: ChartPoint[];
};

const EMPTY_USAGE: UsageAnalyticsState = {
  snapshot: {
    apiRequestsToday: 0,
    apiRequestsWeek: 0,
    storageUsedTb: 0,
    storageLimitTb: 0,
    notificationsSentToday: 0,
    activeUsers: 0,
  },
  apiUsageSeries: [],
  storageGrowthSeries: [],
};

export function UsageAnalyticsPage() {
  const [state, setState] = useState<UsageAnalyticsState>(EMPTY_USAGE);

  useEffect(() => {
    let alive = true;
    fetchAdminData<UsageAnalyticsState>('/admin/analytics/usage')
      .then((data) => {
        if (alive) setState(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const u = state.snapshot;
  return (
    <div className="space-y-4">
      <ResourcePanel title="Usage snapshot">
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">API requests today</div>
            <div className="text-lg font-semibold tabular-nums">{u.apiRequestsToday.toLocaleString()}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">API requests (7d)</div>
            <div className="text-lg font-semibold tabular-nums">{u.apiRequestsWeek.toLocaleString()}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Storage used</div>
            <div className="text-lg font-semibold tabular-nums">{u.storageUsedTb} TB</div>
            <div className="text-[10px] text-slate-500">of {u.storageLimitTb} TB provisioned</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Notifications sent (today)</div>
            <div className="text-lg font-semibold tabular-nums">{u.notificationsSentToday.toLocaleString()}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Active users</div>
            <div className="text-lg font-semibold tabular-nums">{u.activeUsers.toLocaleString()}</div>
          </div>
        </div>
      </ResourcePanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResourcePanel title="API usage (index)">
          <div className="p-3">
            <MiniBarChart
              series={state.apiUsageSeries}
              colorClass="bg-violet-500"
              formatValue={(n) => `${n}k`}
            />
            <p className="mt-2 text-[10px] text-slate-500">Scaled index per day</p>
          </div>
        </ResourcePanel>
        <ResourcePanel title="Storage growth (TB)">
          <div className="p-3">
            <SparkLine series={state.storageGrowthSeries} stroke="stroke-teal-600" />
            <p className="mt-1 text-[10px] text-slate-500">Month-over-month total object storage</p>
          </div>
        </ResourcePanel>
      </div>
    </div>
  );
}
