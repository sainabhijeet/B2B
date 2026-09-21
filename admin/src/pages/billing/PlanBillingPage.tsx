import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { INITIAL_PLAN_BILLING, formatInr, type PlanBillingRow } from '@/lib/billingDemoData';

export function PlanBillingPage() {
  const rows = [...INITIAL_PLAN_BILLING].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal));

  return (
    <div className="space-y-4">
      <ResourcePanel title="Plan billing & renewals">
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
          Per-tenant subscription: current plan, cycle, MRR contribution, and next renewal. Upgrades and renewals
          generate new <span className="font-mono">INV-SA-*</span> invoices on the subscription ledger.
        </p>
        <DataTable
          columns={[
            { id: 'd', header: 'Distributor', cell: (r: PlanBillingRow) => r.distributorName },
            { id: 'p', header: 'Plan', cell: (r: PlanBillingRow) => r.planName },
            { id: 'c', header: 'Cycle', cell: (r: PlanBillingRow) => r.billingCycle },
            { id: 'mrr', header: 'MRR', cell: (r: PlanBillingRow) => formatInr(r.mrr) },
            { id: 'nr', header: 'Next renewal', cell: (r: PlanBillingRow) => r.nextRenewal },
            {
              id: 'li',
              header: 'Last invoice',
              cell: (r: PlanBillingRow) => <span className="font-mono text-[10px]">{r.lastInvoiceId}</span>,
            },
            {
              id: 'a',
              header: 'Actions',
              cell: (r: PlanBillingRow) => (
                <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                  <Link to={`/tenants/${encodeURIComponent(r.tenantId)}/subscription`} className={adminBtnSecondary}>
                    Subscription
                  </Link>
                  <button type="button" className={adminBtnSecondary} onClick={() => window.alert('Upgrade flow (demo)')}>
                    Plan change
                  </button>
                </div>
              ),
            },
          ]}
          rows={rows}
          rowKey={(r) => r.tenantId}
        />
      </ResourcePanel>
    </div>
  );
}
