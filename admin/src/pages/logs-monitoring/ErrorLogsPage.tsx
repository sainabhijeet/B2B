import { useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import type { ErrorLogRow } from '@/lib/logsMonitoringModels';
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

export function ErrorLogsPage() {
  const [rows, setRows] = useState<ErrorLogRow[]>([]);
  const [typeFilter, setTypeFilter] = useState('All');
  const [selected, setSelected] = useState<ErrorLogRow | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAdminData<ErrorLogRow[]>('/admin/logs/errors?limit=1000')
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const types = useMemo(() => ['All', ...new Set(rows.map((r) => r.errorType))], [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => typeFilter === 'All' || r.errorType === typeFilter);
  }, [rows, typeFilter]);

  function downloadLogs() {
    const blob = new Blob(
      [filtered.map((r) => `${r.timestamp}\t${r.errorType}\t${r.module}\t${r.message}\n`).join('')],
      { type: 'text/plain' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `error-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      <ResourcePanel
        title="Error logs"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <select className={sel} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {types.map((t) => (
                <option key={t} value={t === 'All' ? 'All' : t}>
                  {t === 'All' ? 'Error type: All' : t}
                </option>
              ))}
            </select>
            <button type="button" className={adminBtnSecondary} onClick={() => setTypeFilter('All')}>
              Reset
            </button>
            <button type="button" className={adminBtnPrimary} onClick={downloadLogs}>
              Download
            </button>
          </div>
        }
      >
        <DataTable
          columns={[
            { id: 'type', header: 'Error type', cell: (r: ErrorLogRow) => r.errorType },
            { id: 'mod', header: 'Module', cell: (r: ErrorLogRow) => r.module },
            {
              id: 'msg',
              header: 'Message',
              cell: (r: ErrorLogRow) => (
                <span className="max-w-xs truncate" title={r.message}>
                  {r.message}
                </span>
              ),
            },
            { id: 'ts', header: 'Timestamp', cell: (r: ErrorLogRow) => fmt(r.timestamp) },
            {
              id: 'act',
              header: 'Actions',
              cell: (r: ErrorLogRow) => (
                <button
                  type="button"
                  className="text-xs font-medium text-indigo-600 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(r);
                  }}
                >
                  View details
                </button>
              ),
            },
          ]}
          rows={filtered}
          rowKey={(r: ErrorLogRow) => r.id}
          onRowClick={(r: ErrorLogRow) => setSelected(r)}
        />
      </ResourcePanel>

      {selected ? (
        <ResourcePanel
          title={`Error details · ${selected.id}`}
          toolbar={
            <button type="button" className={adminBtnSecondary} onClick={() => setSelected(null)}>
              Close
            </button>
          }
        >
          <div className="space-y-2 p-3 text-xs">
            <div>
              <span className="font-semibold text-slate-600">Type:</span> {selected.errorType} ·{' '}
              <span className="font-semibold text-slate-600">Module:</span> {selected.module}
            </div>
            <div>
              <span className="font-semibold text-slate-600">Message:</span> {selected.message}
            </div>
            <div>
              <span className="font-semibold text-slate-600">Stack trace</span>
            </div>
            <pre className="max-h-64 overflow-auto rounded-sm border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] leading-relaxed text-slate-800">
              {selected.stackTrace}
            </pre>
          </div>
        </ResourcePanel>
      ) : null}
    </div>
  );
}
