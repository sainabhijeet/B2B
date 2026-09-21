import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { CouponProvider } from '@/components/coupons/CouponContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/subscriptions/coupons/list', label: 'Coupon list', end: true },
  { to: '/subscriptions/coupons/new', label: 'Create coupon', end: true },
  { to: '/subscriptions/coupons/campaigns', label: 'Campaigns', end: true },
  { to: '/subscriptions/coupons/analytics', label: 'Analytics', end: true },
  { to: '/subscriptions/coupons/settings', label: 'Settings', end: true },
  { to: '/subscriptions/coupons/distributor-analytics', label: 'Distributor analytics', end: true },
  { to: '/subscriptions/coupons/distributor-usage', label: 'Distributor usage', end: true },
];

export function CouponLayout() {
  return (
    <CouponProvider>
      <div>
        <PageHeader
          title="Subscription coupons"
          description="Platform coupons apply to subscription checkout only. Distributor-issued coupons for product orders are created in the distributor panel; Super Admin can monitor aggregate usage here."
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
    </CouponProvider>
  );
}
