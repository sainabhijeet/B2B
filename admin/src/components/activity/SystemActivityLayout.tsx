import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/activity/feed', label: 'Activity feed', end: true },
  { to: '/activity/tenants', label: 'Tenant activity', end: true },
  { to: '/activity/admin', label: 'Admin activity', end: true },
  { to: '/activity/system', label: 'System events', end: true },
];

export function SystemActivityLayout() {
  return (
    <div>
      <PageHeader
        title="System activity"
        description="Live platform narrative — tenant milestones, admin changes, and infra signals. Distinct from Logs & Monitoring (debug deep-dives)."
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
