import { useMemo } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { useIntegrations } from '@/components/integrations/IntegrationsContext';

function StatCard({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-[10px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function IntegrationsDashboardPage() {
  const {
    dashboardStats,
    smsProviders,
    emailProviders,
    pushProviders,
    paymentGateways,
    storageProviders,
  } = useIntegrations();

  const highlights = useMemo(() => {
    const out: string[] = [];
    const sms = smsProviders.find((s) => s.status === 'active');
    if (sms) out.push(`SMS Provider → ${sms.provider} (Active)`);
    const em = emailProviders.find((s) => s.status === 'active');
    if (em) out.push(`Email → ${em.provider} (Active)`);
    const pu = pushProviders.find((s) => s.status === 'active');
    if (pu) out.push(`Push → ${pu.provider === 'Firebase Cloud Messaging' ? 'Firebase' : pu.provider} (Active)`);
    const pay = paymentGateways.find((s) => s.status === 'active');
    if (pay) out.push(`Payments → ${pay.gateway} (Active)`);
    const st = storageProviders.find((s) => s.status === 'active');
    if (st) out.push(`Storage → ${st.provider} (Active)`);
    return out;
  }, [smsProviders, emailProviders, pushProviders, paymentGateways, storageProviders]);

  return (
    <div className="space-y-4">
      <ResourcePanel title="Integrations dashboard">
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Active integrations" value={dashboardStats.activeCount} hint="SMS, email, push, billing…" />
          <StatCard title="Failed integrations" value={dashboardStats.errorCount} hint="Credentials or provider errors" />
          <StatCard title="API errors today" value={dashboardStats.apiErrorsToday} hint="Outbound provider failures" />
          <StatCard
            title="Last sync status"
            value={dashboardStats.lastSyncLabel}
            hint={`${dashboardStats.inactiveCount} paused (not failed)`}
          />
        </div>
      </ResourcePanel>

      <ResourcePanel title="Active stack (summary)">
        <ul className="list-inside list-disc space-y-1 px-3 py-2 text-sm text-slate-800">
          {highlights.length ? (
            highlights.map((h) => <li key={h}>{h}</li>)
          ) : (
            <li className="text-slate-500">No active providers — enable one under each tab.</li>
          )}
        </ul>
        <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
          Production wiring maps rows to <span className="font-mono">integrations</span> (type, provider,
          credentials_json).
        </p>
      </ResourcePanel>
    </div>
  );
}
