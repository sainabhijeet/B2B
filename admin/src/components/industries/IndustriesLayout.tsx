import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { IndustriesProvider } from '@/components/industries/IndustriesContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/industries/list', label: 'Industry list', end: true },
  { to: '/industries/new', label: 'Add industry', end: true },
  { to: '/industries/mapping', label: 'Industry mapping', end: true },
];

export function IndustriesLayout() {
  return (
    <IndustriesProvider>
      <div>
        <PageHeader
          title="Industries"
          description="Master layer above categories and attributes. Distributors pick one industry at signup; inactive industries are hidden from new registrations."
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
    </IndustriesProvider>
  );
}
