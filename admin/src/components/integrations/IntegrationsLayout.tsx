import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { IntegrationsProvider } from '@/components/integrations/IntegrationsContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/integrations/dashboard', label: 'Integrations dashboard', end: true },
  { to: '/integrations/sms', label: 'SMS providers', end: true },
  { to: '/integrations/email', label: 'Email providers', end: true },
  { to: '/integrations/push', label: 'Push notifications', end: true },
  { to: '/integrations/payments', label: 'Payment gateways', end: true },
  { to: '/integrations/storage', label: 'Storage providers', end: true },
  { to: '/integrations/webhooks', label: 'Webhooks', end: true },
  { to: '/integrations/api-keys', label: 'API keys', end: true },
];

export function IntegrationsLayout() {
  return (
    <IntegrationsProvider>
      <div>
        <PageHeader
          title="Integrations"
          description="Configure SMS, email, push, billing, storage, and outbound webhooks. Secrets stay server-side when wired to your credentials store — this UI is session-local until APIs exist."
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
    </IntegrationsProvider>
  );
}
