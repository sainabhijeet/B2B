import { useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { MiniBarChart, SparkLine } from '@/components/analytics/charts';
import { fetchAdminData } from '@/lib/adminConsoleApi';

type Point = { label: string; value: number };
type HealthSnapshot = {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  queueLength: number;
  activeWorkers: number;
  requestsPerSec: number;
};
type MonitoringState = {
  health: HealthSnapshot;
  cpuSeries: Point[];
  memorySeries: Point[];
  queueSeries: Point[];
};

const EMPTY_MONITORING: MonitoringState = {
  health: {
    cpuPercent: 0,
    memoryPercent: 0,
    diskPercent: 0,
    queueLength: 0,
    activeWorkers: 0,
    requestsPerSec: 0,
  },
  cpuSeries: [],
  memorySeries: [],
  queueSeries: [],
};

function Meter({ label, percent }: { label: string; percent: number }) {
  const color =
    percent >= 85 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-600">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function LogsSystemMonitoringPage() {
  const [state, setState] = useState<MonitoringState>(EMPTY_MONITORING);

  useEffect(() => {
    let alive = true;
    fetchAdminData<MonitoringState>('/admin/monitoring/health')
      .then((data) => {
        if (alive) setState(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const h = state.health;
  return (
    <div className="space-y-4">
      <ResourcePanel title="Live snapshot">
        <div className="grid gap-4 p-3 lg:grid-cols-2">
          <div className="space-y-4">
            <Meter label="CPU usage" percent={h.cpuPercent} />
            <Meter label="Memory" percent={h.memoryPercent} />
            <Meter label="Disk" percent={h.diskPercent} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Queue length</div>
              <div className="text-2xl font-semibold tabular-nums">{h.queueLength}</div>
            </div>
            <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Active workers</div>
              <div className="text-2xl font-semibold tabular-nums">{h.activeWorkers}</div>
            </div>
            <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2 sm:col-span-2">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Ingress RPS (avg)</div>
              <div className="text-2xl font-semibold tabular-nums">{h.requestsPerSec}</div>
            </div>
          </div>
        </div>
      </ResourcePanel>

      <div className="grid gap-4 lg:grid-cols-3">
        <ResourcePanel title="CPU usage (%)">
          <div className="p-3">
            <SparkLine series={state.cpuSeries} stroke="stroke-indigo-600" />
          </div>
        </ResourcePanel>
        <ResourcePanel title="Memory usage (%)">
          <div className="p-3">
            <SparkLine series={state.memorySeries} stroke="stroke-teal-600" />
          </div>
        </ResourcePanel>
        <ResourcePanel title="Build queue size">
          <div className="p-3">
            <MiniBarChart series={state.queueSeries} colorClass="bg-sky-500" />
          </div>
        </ResourcePanel>
      </div>
    </div>
  );
}
