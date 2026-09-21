import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { AnnouncementsProvider } from '@/components/announcements/AnnouncementsContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/announcements/list', label: 'Announcements', end: true },
  { to: '/announcements/create', label: 'Create', end: true },
  { to: '/announcements/audience', label: 'Target audience', end: true },
  { to: '/announcements/history', label: 'History', end: true },
  { to: '/announcements/settings', label: 'Settings', end: true },
];

export function AnnouncementsLayout() {
  return (
    <AnnouncementsProvider>
      <div>
        <PageHeader
          title="Platform announcements"
          description="Broadcast maintenance windows, releases, and promotions. Pair with push/banner surfaces — flow: create → notify → dashboard banner (integrate with your notification service)."
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
    </AnnouncementsProvider>
  );
}
