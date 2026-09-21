import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/analytics/overview', label: 'Platform overview', end: true },
  { to: '/analytics/tenants', label: 'Tenant analytics', end: true },
  { to: '/analytics/usage', label: 'Usage', end: true },
  { to: '/analytics/revenue', label: 'Revenue', end: true },
  { to: '/analytics/builds', label: 'Builds', end: true },
  { to: '/analytics/ads', label: 'Ads', end: true },
  { to: '/analytics/health', label: 'System health', end: true },
  { to: '/analytics/alerts', label: 'Alerts', end: true },
];

export function AnalyticsManagerLayout() {
  return (
    <div>
      <PageHeader
        title="Analytics dashboard"
        description="Cross-tenant metrics, revenue, builds, ads performance, and platform health — wire sections to reporting API when available."
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
                  'whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors',
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
