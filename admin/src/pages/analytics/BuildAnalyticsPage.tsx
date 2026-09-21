import { useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { MiniBarChart, SparkLine } from '@/components/analytics/charts';
import { fetchAdminData, type ChartPoint } from '@/lib/adminConsoleApi';

type BuildSummary = {
  buildsToday: number;
  totalBuildsWeek: number;
  successfulBuilds: number;
  failedBuilds: number;
  successRatePercent: number;
  avgBuildTimeSec: number;
};
type BuildAnalyticsState = {
  summary: BuildSummary;
  trendSeries: ChartPoint[];
  failureSeries: ChartPoint[];
};

const EMPTY_BUILD_ANALYTICS: BuildAnalyticsState = {
  summary: {
    buildsToday: 0,
    totalBuildsWeek: 0,
    successfulBuilds: 0,
    failedBuilds: 0,
    successRatePercent: 0,
    avgBuildTimeSec: 0,
  },
  trendSeries: [],
  failureSeries: [],
};

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function BuildAnalyticsPage() {
  const [state, setState] = useState<BuildAnalyticsState>(EMPTY_BUILD_ANALYTICS);

  useEffect(() => {
    let alive = true;
    fetchAdminData<BuildAnalyticsState>('/admin/analytics/builds')
      .then((data) => {
        if (alive) setState(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const b = state.summary;
  return (
    <div className="space-y-4">
      <ResourcePanel title="Build metrics">
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Builds today</div>
            <div className="text-xl font-semibold tabular-nums">{b.buildsToday}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Week total</div>
            <div className="text-xl font-semibold tabular-nums">{b.totalBuildsWeek}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Successful</div>
            <div className="text-xl font-semibold tabular-nums text-emerald-700">{b.successfulBuilds}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Failed</div>
            <div className="text-xl font-semibold tabular-nums text-red-700">{b.failedBuilds}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Success rate</div>
            <div className="text-xl font-semibold tabular-nums">{b.successRatePercent}%</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Avg build time</div>
            <div className="text-xl font-semibold tabular-nums">{fmtDuration(b.avgBuildTimeSec)}</div>
          </div>
        </div>
      </ResourcePanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResourcePanel title="Build trend (per day)">
          <div className="p-3">
            <SparkLine series={state.trendSeries} stroke="stroke-sky-600" />
            <p className="mt-1 text-[10px] text-slate-500">Completed+failed job count by weekday slice</p>
          </div>
        </ResourcePanel>
        <ResourcePanel title="Failure reasons">
          <div className="p-3">
            <MiniBarChart series={state.failureSeries} colorClass="bg-rose-500" />
          </div>
        </ResourcePanel>
      </div>
    </div>
  );
}
