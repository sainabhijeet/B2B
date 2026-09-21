import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnDanger, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { TenantDetailLoadingGate } from '@/components/tenants/TenantDetailContext';
export function TenantDangerTab() {
  return (
    <TenantDetailLoadingGate>
      {(detail) => (
        <div className="space-y-4">
          <ResourcePanel title="Danger zone">
            <div className="space-y-3 p-3">
              <p className="text-xs text-slate-600">
                Tenant <code className="text-[10px]">{detail.id}</code> · {detail.slug}
              </p>
              <p className="text-xs text-slate-600">
                Irreversible or high-impact actions. Confirm with modals when wired to API.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={adminBtnSecondary}>
                  Suspend tenant
                </button>
                <button type="button" className={adminBtnDanger}>
                  Delete tenant
                </button>
                <button type="button" className={adminBtnSecondary}>
                  Reset API key
                </button>
                <button type="button" className={adminBtnSecondary}>
                  Reset password (owner)
                </button>
              </div>
            </div>
          </ResourcePanel>
        </div>
      )}
    </TenantDetailLoadingGate>
  );
}
