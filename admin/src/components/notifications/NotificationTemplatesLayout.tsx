import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { NotificationTemplatesProvider } from '@/components/notifications/NotificationTemplatesContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/notifications/templates', label: 'Templates', end: true },
  { to: '/notifications/channels', label: 'Channels', end: true },
  { to: '/notifications/variables', label: 'Variables', end: true },
  { to: '/notifications/preview', label: 'Preview', end: true },
  { to: '/notifications/logs', label: 'Logs', end: true },
];

export function NotificationTemplatesLayout() {
  return (
    <NotificationTemplatesProvider>
      <div>
        <PageHeader
          title="Notification templates"
          description="Manage SMS, email, and push copy per event and locale. Runtime replaces {{variables}} when triggers fire (e.g. user_login_otp → OTP Login). Inactive templates are not sent."
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
    </NotificationTemplatesProvider>
  );
}
