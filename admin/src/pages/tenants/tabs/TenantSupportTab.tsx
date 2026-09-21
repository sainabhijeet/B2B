import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { TenantDetailLoadingGate } from '@/components/tenants/TenantDetailContext';
export function TenantSupportTab() {
  return (
    <TenantDetailLoadingGate>
      {(detail) => (
        <div className="space-y-4">
          <ResourcePanel title="Communication">
            <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600">
              Tenant <code className="text-[10px]">{detail.id}</code> · {detail.name}
            </p>
            <div className="flex flex-wrap gap-1.5 p-3">
              <button type="button" className={adminBtnSecondary}>
                Send email
              </button>
              <button type="button" className={adminBtnSecondary}>
                Send notification
              </button>
              <Link to="/support" className={adminBtnSecondary}>
                View all support tickets
              </Link>
            </div>
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              Filter tickets by <span className="font-mono">tenant_id</span> when support API is connected.
            </p>
          </ResourcePanel>
        </div>
      )}
    </TenantDetailLoadingGate>
  );
}
