import { RecordView } from '@/components/ui/RecordView';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { TenantDetailLoadingGate } from '@/components/tenants/TenantDetailContext';
export function TenantDatabaseTab() {
  return (
    <TenantDetailLoadingGate>
      {(detail) => {
        const dbName = `tenant_${detail.slug.replace(/-/g, '_')}`;
        return (
          <div className="space-y-4">
            <RecordView
              sections={[
                {
                  title: 'Database information',
                  fields: [
                    {
                      label: 'Logical database name',
                      value: <code className="text-xs">{dbName}</code>,
                    },
                    { label: 'Storage size', value: '—' },
                    { label: 'Tables count', value: '—' },
                    { label: 'Last backup', value: '—' },
                  ],
                },
              ]}
            />
            <ResourcePanel title="Actions">
              <div className="flex flex-wrap gap-1.5 p-3">
                <button type="button" className={adminBtnSecondary}>
                  View DB stats
                </button>
                <button type="button" className={adminBtnSecondary}>
                  Backup database
                </button>
              </div>
              <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
                Single-DB multi-tenant schema uses <span className="font-mono">tenant_id</span>; name above is a label
                only until infra exposes real stats.
              </p>
            </ResourcePanel>
          </div>
        );
      }}
    </TenantDetailLoadingGate>
  );
}
