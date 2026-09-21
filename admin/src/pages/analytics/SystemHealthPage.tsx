import { useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { fetchAdminData } from '@/lib/adminConsoleApi';

type SystemHealth = {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  queueLength: number;
  activeWorkers: number;
  requestsPerSec: number;
};

const EMPTY_HEALTH: SystemHealth = {
  cpuPercent: 0,
  memoryPercent: 0,
  diskPercent: 0,
  queueLength: 0,
  activeWorkers: 0,
  requestsPerSec: 0,
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

export function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth>(EMPTY_HEALTH);

  useEffect(() => {
    let alive = true;
    fetchAdminData<SystemHealth>('/admin/monitoring/health')
      .then((data) => {
        if (alive) setHealth(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <ResourcePanel title="Infrastructure snapshot">
        <div className="grid gap-4 p-3 lg:grid-cols-2">
          <div className="space-y-4">
            <Meter label="Server CPU" percent={health.cpuPercent} />
            <Meter label="Memory" percent={health.memoryPercent} />
            <Meter label="Disk / volume" percent={health.diskPercent} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Queue length</div>
              <div className="text-2xl font-semibold tabular-nums">{health.queueLength}</div>
              <div className="text-[10px] text-slate-500">pending builds</div>
            </div>
            <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Active workers</div>
              <div className="text-2xl font-semibold tabular-nums">{health.activeWorkers}</div>
            </div>
            <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2 sm:col-span-2">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Ingress RPS (avg)</div>
              <div className="text-2xl font-semibold tabular-nums">{health.requestsPerSec}</div>
            </div>
          </div>
        </div>
      </ResourcePanel>
    </div>
  );
}
