import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { SchedulerProvider } from '@/components/scheduler/SchedulerContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/scheduler/jobs', label: 'Scheduled jobs', end: true },
  { to: '/scheduler/queue', label: 'Job queue', end: true },
  { to: '/scheduler/history', label: 'Job history', end: true },
  { to: '/scheduler/manual', label: 'Manual trigger', end: true },
  { to: '/scheduler/settings', label: 'Scheduler settings', end: true },
];

export function SchedulerLayout() {
  return (
    <SchedulerProvider>
      <div>
        <PageHeader
          title="System scheduler"
          description="Cron-style schedules, worker queues, and one-off runs. Wire to Redis / BullMQ or Celery; this UI is session-local until your job API is connected."
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
    </SchedulerProvider>
  );
}
