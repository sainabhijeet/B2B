import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { LanguageModuleProvider } from '@/components/language/LanguageModuleContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/languages/list', label: 'Languages', end: true },
  { to: '/languages/keys', label: 'Translation keys', end: true },
  { to: '/languages/translations', label: 'Translations', end: true },
  { to: '/languages/import-export', label: 'Import / Export', end: true },
  { to: '/languages/settings', label: 'Language settings', end: true },
];

export function LanguageModuleLayout() {
  return (
    <LanguageModuleProvider>
      <div>
        <PageHeader
          title="Languages & translations"
          description="Control platform locales, translation keys, and default copy for apps and storefronts. Tenant-specific overrides stay isolated per tenant."
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
    </LanguageModuleProvider>
  );
}
