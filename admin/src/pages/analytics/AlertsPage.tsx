import { useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { loadAdminModuleState } from '@/lib/adminModuleStateApi';
import type { MonitoringAlertRow } from '@/lib/logsMonitoringModels';

function severityStyle(s: MonitoringAlertRow['severity']) {
  if (s === 'critical') return 'border-red-200 bg-red-50 text-red-900';
  if (s === 'warning') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-slate-50 text-slate-800';
}

export function AlertsPage() {
  const [alerts, setAlerts] = useState<MonitoringAlertRow[]>([]);

  useEffect(() => {
    let alive = true;
    loadAdminModuleState<MonitoringAlertRow[]>('monitoring_alerts', [])
      .then((data) => {
        if (alive) setAlerts(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <ResourcePanel title="Alerts & notifications">
        <ul className="divide-y divide-slate-100">
          {alerts.map((a) => (
            <li key={a.id} className={`m-3 rounded-sm border p-3 text-sm ${severityStyle(a.severity)}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="font-semibold">{a.title}</div>
                <span className="text-[10px] uppercase tracking-wide opacity-80">{a.severity}</span>
              </div>
              <p className="mt-1 text-xs opacity-90">{a.message}</p>
              <p className="mt-2 font-mono text-[10px] opacity-70">{a.at}</p>
            </li>
          ))}
        </ul>
      </ResourcePanel>
    </div>
  );
}
