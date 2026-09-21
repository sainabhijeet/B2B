import { RecordView } from '@/components/ui/RecordView';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { TenantDetailLoadingGate } from '@/components/tenants/TenantDetailContext';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
export function TenantDomainsTab() {
  return (
    <TenantDetailLoadingGate>
      {(detail) => (
        <div className="space-y-4">
          <RecordView
            sections={[
              {
                title: 'Domain configuration',
                fields: [
                  {
                    label: 'Primary domain (derived)',
                    value: `${detail.slug}.store`,
                  },
                  {
                    label: 'Custom domain',
                    value: 'Not configured — wire tenant_domains API',
                  },
                  { label: 'SSL status', value: <span className="text-slate-500">N/A</span> },
                  { label: 'DNS status', value: <span className="text-slate-500">N/A</span> },
                ],
              },
            ]}
          />
          <ResourcePanel title="Actions">
            <div className="flex flex-wrap gap-1.5 p-3">
              <button type="button" className={adminBtnSecondary}>
                Update domain
              </button>
              <button type="button" className={adminBtnSecondary}>
                Verify domain
              </button>
            </div>
          </ResourcePanel>
        </div>
      )}
    </TenantDetailLoadingGate>
  );
}
