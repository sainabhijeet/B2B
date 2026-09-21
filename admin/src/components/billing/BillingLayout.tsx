import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/billing/invoices', label: 'Subscription invoices', end: true },
  { to: '/billing/payments', label: 'Payments', end: true },
  { to: '/billing/plan-billing', label: 'Plan billing', end: true },
  { to: '/billing/revenue', label: 'Revenue reports', end: true },
  { to: '/billing/refunds', label: 'Refunds', end: true },
];

export function BillingLayout() {
  return (
    <div>
      <PageHeader
        title="Billing (SaaS subscriptions)"
        description="Subscription invoices, payments, renewals, and refunds for distributors on your platform. Product sales invoices (INV-ORD-*) belong in the distributor panel — Super Admin does not manage order billing."
      />
      <div className="-mx-1 mb-4 overflow-x-auto border-b border-slate-200">
        <nav className="flex min-w-max gap-px px-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end ?? false}
              className={({ isActive }) =>
                [
                  'whitespace-nowrap border-b-2 px-2.5 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
