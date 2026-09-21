import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/ads/dashboard', label: 'Dashboard', end: true },
  { to: '/ads/campaigns', label: 'Campaigns', end: true },
  { to: '/ads/campaigns/new', label: 'Create campaign', end: true },
  { to: '/ads/creatives', label: 'Creatives', end: true },
  { to: '/ads/placements', label: 'Placements', end: true },
  { to: '/ads/analytics', label: 'Analytics', end: true },
  { to: '/ads/settings', label: 'Settings', end: true },
];

export function AdsManagerLayout() {
  return (
    <div>
      <PageHeader
        title="Ads manager"
        description="Manage platform-wide campaigns, creatives, placements, targeting and analytics for tenant app + website surfaces."
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
