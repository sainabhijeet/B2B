import { useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import type { LoginLogRow } from '@/lib/logsMonitoringModels';
import { fetchAdminData } from '@/lib/adminConsoleApi';

const sel =
  'rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800';

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function statusLabel(s: LoginLogRow['status']) {
  if (s === 'success') return <span className="text-emerald-700">Success</span>;
  if (s === 'failed') return <span className="text-red-700">Failed</span>;
  return <span className="text-slate-600">Logout</span>;
}

export function LoginLogsPage() {
  const [rows, setRows] = useState<LoginLogRow[]>([]);
  const [status, setStatus] = useState<string>('all');

  useEffect(() => {
    let alive = true;
    fetchAdminData<LoginLogRow[]>('/admin/logs/logins?limit=1000')
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (status === 'all') return rows;
    return rows.filter((r) => r.status === status);
  }, [rows, status]);

  return (
    <ResourcePanel
      title="Login logs"
      toolbar={
        <div className="flex items-center gap-2">
          <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All events</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="logout">Logout</option>
          </select>
          <button type="button" className={adminBtnSecondary} onClick={() => setStatus('all')}>
            Reset
          </button>
        </div>
      }
    >
      <DataTable
        columns={[
          { id: 'user', header: 'User', cell: (r: LoginLogRow) => r.user },
          {
            id: 'ip',
            header: 'IP address',
            cell: (r: LoginLogRow) => <span className="font-mono text-[10px]">{r.ip}</span>,
          },
          { id: 'device', header: 'Device', cell: (r: LoginLogRow) => r.device },
          { id: 'status', header: 'Status', cell: (r: LoginLogRow) => statusLabel(r.status) },
          { id: 'ts', header: 'Timestamp', cell: (r: LoginLogRow) => fmt(r.timestamp) },
        ]}
        rows={filtered}
        rowKey={(r: LoginLogRow) => r.id}
      />
    </ResourcePanel>
  );
}
