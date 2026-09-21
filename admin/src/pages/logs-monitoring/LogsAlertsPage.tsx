import { useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import type { MonitoringAlertRow } from '@/lib/logsMonitoringModels';
import { loadAdminModuleState, saveAdminModuleState } from '@/lib/adminModuleStateApi';

function severityStyle(s: MonitoringAlertRow['severity']) {
  if (s === 'critical') return 'border-red-200 bg-red-50 text-red-900';
  if (s === 'warning') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-slate-50 text-slate-800';
}

export function LogsAlertsPage() {
  const [rows, setRows] = useState<MonitoringAlertRow[]>([]);

  useEffect(() => {
    let alive = true;
    loadAdminModuleState<MonitoringAlertRow[]>('monitoring_alerts', [])
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  function resolve(id: string) {
    setRows((r) => {
      const next = r.map((x) => (x.id === id ? { ...x, resolved: true } : x));
      void saveAdminModuleState('monitoring_alerts', next);
      return next;
    });
  }

  return (
    <ResourcePanel title="Alerts & notifications">
      <ul className="divide-y divide-slate-100">
        {rows.map((a) => (
          <li
            key={a.id}
            className={`m-3 rounded-sm border p-3 text-sm ${severityStyle(a.severity)} ${a.resolved ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="font-semibold">
                {a.title}
                {a.resolved ? (
                  <span className="ml-2 text-[10px] font-normal uppercase text-emerald-700">Resolved</span>
                ) : null}
              </div>
              <span className="text-[10px] uppercase tracking-wide opacity-80">{a.severity}</span>
            </div>
            <p className="mt-1 text-xs opacity-90">{a.message}</p>
            <p className="mt-2 font-mono text-[10px] opacity-70">{a.at}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={a.resolved}
                className="rounded-sm border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => resolve(a.id)}
              >
                Mark resolved
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-sm border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => window.alert(`Notification queued for "${a.title}".`)}
              >
                Send notification
              </button>
            </div>
          </li>
        ))}
      </ul>
    </ResourcePanel>
  );
}
