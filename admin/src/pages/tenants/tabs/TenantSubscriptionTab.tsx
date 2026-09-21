import { RecordView } from '@/components/ui/RecordView';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { TenantDetailLoadingGate } from '@/components/tenants/TenantDetailContext';
import { adminBtnDanger, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { billingCycleLabel, formatPlanPrice } from '@/lib/tenantsApi';

export function TenantSubscriptionTab() {
  return (
    <TenantDetailLoadingGate>
      {(detail) => {
        const sub = detail.subscription;
        return (
          <div className="space-y-4">
            <RecordView
              sections={[
                {
                  title: 'Subscription',
                  fields: [
                    { label: 'Subscription ID', value: sub ? <code className="text-xs">{sub.id}</code> : '—' },
                    { label: 'Plan name', value: detail.plan?.name ?? sub?.planName ?? '—' },
                    {
                      label: 'Billing cycle',
                      value: detail.plan ? billingCycleLabel(detail.plan.billingCycle) : '—',
                    },
                    { label: 'Price (plan list)', value: formatPlanPrice(detail.plan) },
                    { label: 'Subscription status', value: sub?.status ?? '—' },
                    { label: 'Start date', value: sub?.startDate ?? '—' },
                    { label: 'Expiry date', value: sub?.expiryDate ?? '—' },
                    { label: 'End date', value: sub?.endDate ?? '—' },
                    {
                      label: 'Trial ends',
                      value: sub?.trialEndsAt
                        ? new Date(sub.trialEndsAt).toLocaleString()
                        : '—',
                    },
                  ],
                },
              ]}
            />
            <ResourcePanel title="Plan actions">
              <div className="flex flex-wrap gap-1.5 p-3">
                <button type="button" className={adminBtnSecondary}>
                  Upgrade plan
                </button>
                <button type="button" className={adminBtnSecondary}>
                  Downgrade plan
                </button>
                <button type="button" className={adminBtnSecondary}>
                  Extend subscription
                </button>
                <button type="button" className={adminBtnDanger}>
                  Cancel subscription
                </button>
              </div>
              <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                Wire to <span className="font-mono">PATCH /admin/billing/subscriptions</span> when ready.
              </p>
            </ResourcePanel>
          </div>
        );
      }}
    </TenantDetailLoadingGate>
  );
}
