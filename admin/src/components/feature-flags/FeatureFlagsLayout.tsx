import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { FeatureFlagsProvider } from '@/components/feature-flags/FeatureFlagsContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/feature-flags/flags', label: 'Feature flags', end: true },
  { to: '/feature-flags/groups', label: 'Feature groups', end: true },
  { to: '/feature-flags/plans', label: 'Plan based access', end: true },
  { to: '/feature-flags/overrides', label: 'Tenant overrides', end: true },
  { to: '/feature-flags/logs', label: 'Feature logs', end: true },
];

export function FeatureFlagsLayout() {
  return (
    <FeatureFlagsProvider>
      <div>
        <PageHeader
          title="Feature flags & module control"
          description="Turn platform capabilities on or off without deploys. Plan matrix gates entitlements; tenant overrides win for specials, beta, and contracts."
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
    </FeatureFlagsProvider>
  );
}
