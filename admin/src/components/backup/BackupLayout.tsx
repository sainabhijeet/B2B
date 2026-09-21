import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { BackupProvider } from '@/components/backup/BackupContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/backup/dashboard', label: 'Dashboard', end: true },
  { to: '/backup/manual', label: 'Manual backup', end: true },
  { to: '/backup/history', label: 'Backup history', end: true },
  { to: '/backup/restore', label: 'Restore', end: true },
  { to: '/backup/settings', label: 'Settings', end: true },
];

export function BackupLayout() {
  return (
    <BackupProvider>
      <div>
        <PageHeader
          title="Backup & restore"
          description="Protect tenant and platform data with encrypted, scheduled dumps. Restores overwrite the target environment — use staging first."
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
    </BackupProvider>
  );
}
