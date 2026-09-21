import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import {
  PLAN_LIST_ROWS,
  type PlanListRow,
  type PlanStatus,
} from '@/lib/planDemoData';

function statusStyle(s: PlanStatus) {
  const m: Record<PlanStatus, string> = {
    active: 'text-emerald-700',
    hidden: 'text-slate-600',
    disabled: 'text-red-700',
  };
  return m[s];
}

export function PlanListPage() {
  return (
    <div>
      <PageHeader
        title="Subscription plans"
        description="Create pricing, limits, and feature access for SaaS tenants (demo data)."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Link to="/subscriptions/plans/matrix" className={adminBtnSecondary}>
              Feature matrix
            </Link>
            <Link to="/subscriptions/plans/new" className={adminBtnPrimary}>
              Create plan
            </Link>
          </div>
        }
      />
      <ResourcePanel>
        <DataTable
          columns={[
            { id: 'name', header: 'Plan name', cell: (r) => r.name },
            { id: 'price', header: 'Price', cell: (r) => r.priceDisplay },
            {
              id: 'cycle',
              header: 'Billing cycle',
              cell: (r) => r.billingCycle,
            },
            {
              id: 'tenants',
              header: 'Active tenants',
              cell: (r) => (
                <Link
                  className="font-semibold text-indigo-600 hover:underline tabular-nums"
                  title="View tenants on this plan (active)"
                  to={`/tenants?plan=${encodeURIComponent(r.name)}&status=active`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.activeTenants}
                </Link>
              ),
            },
            {
              id: 'status',
              header: 'Status',
              cell: (r) => (
                <span className={`text-xs font-medium capitalize ${statusStyle(r.status)}`}>
                  {r.status}
                </span>
              ),
            },
            { id: 'created', header: 'Created', cell: (r) => r.createdAt },
            {
              id: 'actions',
              header: 'Actions',
              className: 'min-w-[12rem] whitespace-normal',
              cell: (r: PlanListRow) => (
                <div
                  className="flex max-w-[14rem] flex-wrap gap-x-2 gap-y-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    className="font-medium text-indigo-600 hover:underline"
                    to={`/subscriptions/plans/${r.id}/edit`}
                  >
                    Edit
                  </Link>
                  <button type="button" className="font-medium text-slate-700 hover:underline">
                    Disable
                  </button>
                  <button type="button" className="font-medium text-slate-700 hover:underline">
                    Duplicate
                  </button>
                  <button type="button" className="font-medium text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
          rows={PLAN_LIST_ROWS}
          rowKey={(r) => r.id}
        />
      </ResourcePanel>
      <p className="mt-2 text-xs text-slate-500">
        DB mapping example: <code className="text-xs">plans</code>,{' '}
        <code className="text-xs">plan_features</code>, <code className="text-xs">plan_limits</code>{' '}
        — wire actions to API later.
      </p>
    </div>
  );
}
