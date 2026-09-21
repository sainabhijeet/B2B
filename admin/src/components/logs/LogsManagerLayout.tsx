import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/logs/activity', label: 'Activity', end: true },
  { to: '/logs/api', label: 'API', end: true },
  { to: '/logs/errors', label: 'Errors', end: true },
  { to: '/logs/login', label: 'Login', end: true },
  { to: '/logs/builds', label: 'Build logs', end: true },
  { to: '/logs/monitoring', label: 'Monitoring', end: true },
  { to: '/logs/alerts', label: 'Alerts', end: true },
];

export function LogsManagerLayout() {
  return (
    <div>
      <PageHeader
        title="Logs & monitoring"
        description="Audit trails, API traffic, failures, auth events, build output, and live signals — connect to log store & metrics backend."
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
