import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { LocationProvider } from '@/components/locations/LocationContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/locations/countries', label: 'Countries', end: true },
  { to: '/locations/states', label: 'States', end: true },
  { to: '/locations/cities', label: 'Cities', end: true },
  { to: '/locations/pincodes', label: 'Pincodes', end: true },
];

export function LocationLayout() {
  return (
    <LocationProvider>
      <div>
        <PageHeader
          title="Location management"
          description="PostgreSQL-backed hierarchy: countries (paginated list), then states → cities → pincodes with server-side pagination and filters (no bulk master fetch)."
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
    </LocationProvider>
  );
}
