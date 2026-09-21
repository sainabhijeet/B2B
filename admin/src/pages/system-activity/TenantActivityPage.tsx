import { useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useSystemActivity } from '@/hooks/useSystemActivity';

const sel =
  'rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800';

type Row = {
  id: string;
  tenant: string;
  action: string;
  module: string;
  timestamp: string;
};

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function TenantActivityPage() {
  const { events, modules, error } = useSystemActivity();
  const [module, setModule] = useState('All');

  const rows: Row[] = useMemo(() => {
    const items = events.filter((i) => i.category === 'tenant');
    const modFiltered = module === 'All' ? items : items.filter((i) => i.module === module);
    return modFiltered.map((i) => ({
      id: i.id,
      tenant: i.tenantName ?? i.tenantId ?? '—',
      action: i.message,
      module: i.module,
      timestamp: i.timestamp,
    }));
  }, [events, module]);

  return (
    <ResourcePanel
      title="Tenant activity"
      toolbar={
        <div className="flex items-center gap-2">
          <select className={sel} value={module} onChange={(e) => setModule(e.target.value)}>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button type="button" className={adminBtnSecondary} onClick={() => setModule('All')}>
            Reset
          </button>
        </div>
      }
    >
      {error ? <p className="border-t border-slate-100 p-3 text-xs text-red-600">{error}</p> : null}
      <DataTable
        columns={[
          { id: 'tenant', header: 'Tenant', cell: (r: Row) => r.tenant },
          { id: 'action', header: 'Action', cell: (r: Row) => r.action },
          { id: 'module', header: 'Module', cell: (r: Row) => r.module },
          { id: 'ts', header: 'Timestamp', cell: (r: Row) => fmt(r.timestamp) },
        ]}
        rows={rows}
        rowKey={(r: Row) => r.id}
      />
    </ResourcePanel>
  );
}
