import { useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import type { ApiLogRow } from '@/lib/logsMonitoringModels';
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

function statusClass(code: number) {
  if (code >= 500) return 'text-red-700 font-semibold';
  if (code >= 400) return 'text-amber-700 font-semibold';
  return 'text-emerald-700';
}

export function ApiLogsPage() {
  const [rows, setRows] = useState<ApiLogRow[]>([]);
  const [status, setStatus] = useState<string>('all');
  const [endpointQ, setEndpointQ] = useState('');
  const [tenantQ, setTenantQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    let alive = true;
    fetchAdminData<ApiLogRow[]>('/admin/logs/api?limit=1000')
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status === '2xx' && (r.status < 200 || r.status >= 300)) return false;
      if (status === '4xx' && (r.status < 400 || r.status >= 500)) return false;
      if (status === '5xx' && r.status < 500) return false;
      if (endpointQ.trim() && !r.endpoint.toLowerCase().includes(endpointQ.toLowerCase().trim())) {
        return false;
      }
      if (tenantQ.trim()) {
        const tid = r.tenantId ?? '';
        if (!tid.toLowerCase().includes(tenantQ.toLowerCase().trim())) return false;
      }
      const t = new Date(r.timestamp).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime() + 86400000) return false;
      return true;
    });
  }, [rows, status, endpointQ, tenantQ, from, to]);

  return (
    <div className="space-y-4">
      <ResourcePanel
        title="API logs"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="2xx">2xx</option>
              <option value="4xx">4xx</option>
              <option value="5xx">5xx</option>
            </select>
            <input
              placeholder="Endpoint contains…"
              className={sel + ' min-w-[8rem]'}
              value={endpointQ}
              onChange={(e) => setEndpointQ(e.target.value)}
            />
            <input
              placeholder="Tenant ID…"
              className={sel + ' min-w-[7rem]'}
              value={tenantQ}
              onChange={(e) => setTenantQ(e.target.value)}
            />
            <input type="date" className={sel} value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className={sel} value={to} onChange={(e) => setTo(e.target.value)} />
            <button
              type="button"
              className={adminBtnSecondary}
              onClick={() => {
                setStatus('all');
                setEndpointQ('');
                setTenantQ('');
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
              id: 'endpoint',
              header: 'Endpoint',
              cell: (r: ApiLogRow) => <span className="font-mono text-[10px]">{r.endpoint}</span>,
            },
            { id: 'method', header: 'Method', cell: (r: ApiLogRow) => r.method },
            {
              id: 'status',
              header: 'Status',
              cell: (r: ApiLogRow) => <span className={statusClass(r.status)}>{r.status}</span>,
            },
            {
              id: 'lat',
              header: 'Latency',
              cell: (r: ApiLogRow) => `${r.latencyMs}ms`,
              className: 'tabular-nums',
            },
            {
              id: 'tenant',
              header: 'Tenant ID',
              cell: (r: ApiLogRow) => (
                <span className="font-mono text-[10px]">{r.tenantId ?? '—'}</span>
              ),
            },
            { id: 'ts', header: 'Timestamp', cell: (r: ApiLogRow) => fmt(r.timestamp) },
          ]}
          rows={filtered}
          rowKey={(r: ApiLogRow) => r.id}
        />
      </ResourcePanel>
    </div>
  );
}
