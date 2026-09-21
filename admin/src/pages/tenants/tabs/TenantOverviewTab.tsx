import { RecordView } from '@/components/ui/RecordView';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { TenantDetailLoadingGate } from '@/components/tenants/TenantDetailContext';
import { adminBtnDanger, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { billingCycleLabel, formatPlanPrice, ownerDisplayName } from '@/lib/tenantsApi';

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function TenantOverviewTab() {
  return (
    <TenantDetailLoadingGate>
      {(detail) => (
        <div className="space-y-4">
          <ResourcePanel title="Status control">
            <div className="flex flex-wrap gap-1.5 p-3">
              <button type="button" className={adminBtnSecondary}>
                Activate
              </button>
              <button type="button" className={adminBtnSecondary}>
                Suspend
              </button>
              <button type="button" className={adminBtnSecondary}>
                Block
              </button>
              <button type="button" className={adminBtnDanger}>
                Delete tenant
              </button>
            </div>
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              Actions are UI-only until PATCH tenant API is wired.
            </p>
          </ResourcePanel>

          <RecordView
            sections={[
              {
                title: 'Business information',
                fields: [
                  { label: 'Business name', value: detail.name },
                  { label: 'Slug', value: detail.slug },
                  { label: 'Owner (from email)', value: ownerDisplayName(detail.owner) },
                  { label: 'Email', value: detail.owner?.email ?? '—' },
                  { label: 'Phone', value: detail.owner?.phone ?? '—' },
                  { label: 'Plan', value: detail.plan?.name ?? '—' },
                  { label: 'Created', value: fmtDate(detail.createdAt) },
                  { label: 'Last updated', value: fmtDate(detail.updatedAt) },
                ],
              },
              {
                title: 'App info',
                fields: [
                  {
                    label: 'Storefront host (derived)',
                    value: `${detail.slug}.store`,
                  },
                  {
                    label: 'Billing cycle',
                    value: detail.plan ? billingCycleLabel(detail.plan.billingCycle) : '—',
                  },
                  {
                    label: 'List price (plan)',
                    value: formatPlanPrice(detail.plan),
                  },
                ],
              },
            ]}
          />

          <ResourcePanel title="Quick actions">
            <div className="flex flex-wrap gap-1.5 p-3">
              <button type="button" className={adminBtnSecondary}>
                Edit tenant
              </button>
              <button type="button" className={adminBtnSecondary}>
                Upgrade plan
              </button>
              <button type="button" className={adminBtnSecondary}>
                Reset API key
              </button>
            </div>
          </ResourcePanel>
        </div>
      )}
    </TenantDetailLoadingGate>
  );
}
