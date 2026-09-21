import { NavLink, Outlet } from 'react-router-dom';
import { ThemesProvider } from '@/components/themes/ThemesContext';
import { PageHeader } from '@/components/ui/PageHeader';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/themes/dashboard', label: 'Dashboard', end: true },
  { to: '/themes/list', label: 'Catalog', end: true },
  { to: '/themes/combo-packs', label: 'Combo packs', end: true },
  { to: '/themes/preview', label: 'Preview lab', end: true },
  { to: '/themes/upload', label: 'Upload package', end: true },
  { to: '/themes/translations', label: 'Translations', end: true },
  { to: '/themes/localization', label: 'Localization health', end: true },
];

export function ThemeManagerLayout() {
  return (
    <ThemesProvider>
      <div>
        <PageHeader
          title="Themes manager"
          description="Upload, validate, preview and publish storefront themes across web and mobile channels."
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
    </ThemesProvider>
  );
}
