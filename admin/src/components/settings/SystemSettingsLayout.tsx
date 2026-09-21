import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/settings/platform', label: 'Platform', end: true },
  { to: '/settings/platform-config', label: 'Config store', end: true },
  { to: '/settings/ai-branding', label: 'AI branding', end: true },
  { to: '/settings/authentication', label: 'Authentication', end: true },
  { to: '/settings/notifications', label: 'Notifications', end: true },
  { to: '/settings/payment', label: 'Payment', end: true },
  { to: '/settings/build', label: 'Build', end: true },
  { to: '/settings/storage', label: 'Storage', end: true },
  { to: '/settings/api', label: 'API', end: true },
  { to: '/settings/security', label: 'Security', end: true },
  { to: '/settings/maintenance', label: 'Maintenance', end: true },
  { to: '/settings/logs', label: 'Logs', end: true },
];

export function SystemSettingsLayout() {
  return (
    <div>
      <PageHeader
        title="System settings"
        description="Platform-wide configuration — keys map to system_settings-style storage (setting_key / setting_value)."
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
