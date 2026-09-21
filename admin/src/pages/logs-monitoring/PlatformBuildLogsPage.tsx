import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import type { PlatformBuildLogRow } from '@/lib/logsMonitoringModels';
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

function statusCell(s: PlatformBuildLogRow['status']) {
  const m: Record<PlatformBuildLogRow['status'], string> = {
    queued: 'text-slate-600',
    running: 'text-blue-700',
    success: 'text-emerald-700',
    failed: 'text-red-700',
  };
  return <span className={`font-semibold capitalize ${m[s]}`}>{s}</span>;
}

export function PlatformBuildLogsPage() {
  const [rows, setRows] = useState<PlatformBuildLogRow[]>([]);
  const [status, setStatus] = useState<string>('all');

  useEffect(() => {
    let alive = true;
    fetchAdminData<PlatformBuildLogRow[]>('/admin/logs/builds?limit=1000')
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
    <div className="space-y-4">
      <ResourcePanel
        title="Build process logs"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <button type="button" className={adminBtnSecondary} onClick={() => setStatus('all')}>
              Reset
            </button>
            <Link to="/build/logs" className={adminBtnSecondary}>
              Open Build Manager logs
            </Link>
          </div>
        }
      >
        <DataTable
          columns={[
            {
              id: 'bid',
              header: 'Build ID',
              cell: (r: PlatformBuildLogRow) => (
                <span className="font-mono text-[10px]">{r.buildId}</span>
              ),
            },
            { id: 'tenant', header: 'Tenant', cell: (r: PlatformBuildLogRow) => r.tenant },
            {
              id: 'status',
              header: 'Status',
              cell: (r: PlatformBuildLogRow) => statusCell(r.status),
            },
            {
              id: 'msg',
              header: 'Message',
              cell: (r: PlatformBuildLogRow) => (
                <span className="max-w-md truncate" title={r.message}>
                  {r.message}
                </span>
              ),
            },
            { id: 'ts', header: 'Timestamp', cell: (r: PlatformBuildLogRow) => fmt(r.timestamp) },
          ]}
          rows={filtered}
          rowKey={(r: PlatformBuildLogRow) => r.id}
        />
      </ResourcePanel>
    </div>
  );
}
