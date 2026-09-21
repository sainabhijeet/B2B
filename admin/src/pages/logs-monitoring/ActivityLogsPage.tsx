import { useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { fetchActivityLogs } from '@/lib/adminConsoleApi';
import type { ActivityLogRow } from '@/lib/logsMonitoringModels';

const sel = 'rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800';

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function ActivityLogsPage() {
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [module, setModule] = useState('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    let alive = true;
    fetchActivityLogs()
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const modules = useMemo(() => ['All', ...new Set(rows.map((r) => r.module).filter(Boolean))], [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (userFilter.trim() && !r.user.toLowerCase().includes(userFilter.toLowerCase().trim())) {
        return false;
      }
      if (module !== 'All' && r.module !== module) return false;
      const t = new Date(r.timestamp).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime() + 86400000) return false;
      return true;
    });
  }, [rows, userFilter, module, from, to]);

  return (
    <div className="space-y-4">
      <ResourcePanel
        title="Activity logs"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="User email..."
              className={sel + ' min-w-[8rem]'}
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            />
            <select className={sel} value={module} onChange={(e) => setModule(e.target.value)}>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input type="date" className={sel} value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-[10px] text-slate-500">to</span>
            <input type="date" className={sel} value={to} onChange={(e) => setTo(e.target.value)} />
            <button
              type="button"
              className={adminBtnSecondary}
              onClick={() => {
                setUserFilter('');
                setModule('All');
                setFrom('');
                setTo('');
              }}
            >
              Reset
            </button>
          </div>
        }
      >
        <DataTable
          columns={[
            {
              id: 'id',
              header: 'Log ID',
              cell: (r: ActivityLogRow) => <span className="font-mono text-[10px]">{r.id}</span>,
            },
            { id: 'user', header: 'User', cell: (r: ActivityLogRow) => r.user },
            { id: 'action', header: 'Action', cell: (r: ActivityLogRow) => r.action },
            { id: 'module', header: 'Module', cell: (r: ActivityLogRow) => r.module },
            {
              id: 'ip',
              header: 'IP address',
              cell: (r: ActivityLogRow) => <span className="font-mono text-[10px]">{r.ip}</span>,
            },
            { id: 'ts', header: 'Timestamp', cell: (r: ActivityLogRow) => fmt(r.timestamp) },
          ]}
          rows={filtered}
          rowKey={(r: ActivityLogRow) => r.id}
        />
      </ResourcePanel>
    </div>
  );
}
