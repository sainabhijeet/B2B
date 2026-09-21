import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { TenantDetailLoadingGate } from '@/components/tenants/TenantDetailContext';
type LogRow = { id: string; action: string; user: string; at: string };

export function TenantActivityTab() {
  return (
    <TenantDetailLoadingGate>
      {(detail) => {
        const rows: LogRow[] = [
          {
            id: 'seed-1',
            action: 'Tenant record present (loaded from API)',
            user: 'system',
            at: new Date(detail.createdAt).toLocaleString(),
          },
        ];
        return (
          <ResourcePanel title="Activity log">
            <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
              Minimal view from tenant metadata. Full audit stream: wire{' '}
              <span className="font-mono">GET /admin/audit?tenantId=…</span> when available.
            </p>
            <DataTable
              columns={[
                { id: 'action', header: 'Action', cell: (r) => r.action },
                { id: 'user', header: 'User', cell: (r) => r.user },
                { id: 'at', header: 'Timestamp', cell: (r) => r.at },
              ]}
              rows={rows}
              rowKey={(r) => r.id}
            />
          </ResourcePanel>
        );
      }}
    </TenantDetailLoadingGate>
  );
}
