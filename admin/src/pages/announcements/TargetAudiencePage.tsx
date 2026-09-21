import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { AUDIENCE_LABELS, LOCATION_LABELS, type Audience, type DisplayLocation } from '@/lib/announcementsDemoData';

const AUDIENCE_USE_CASES: Record<Audience, string> = {
  all_tenants: 'Maintenance windows, global releases, holiday notices.',
  free_plan: 'Upgrade promotions, feature teasers for conversion.',
  paid_plan: 'Premium-only tips, billing or add-on announcements.',
  specific_tenant: 'Enterprise contracts, beta cohorts, SLA notices.',
  admin_users: 'Security bulletins, admin-only procedural updates.',
};

const LOCATION_EXAMPLES: Record<DisplayLocation, string> = {
  distributor_dashboard: 'Dashboard banner / card at top of tenant home.',
  admin_panel: 'Super admin + distributor admin chrome.',
  app_notification: 'Push or in-app inbox (mobile / PWA).',
  website_banner: 'Public storefront or marketing site strip.',
};

export function TargetAudiencePage() {
  return (
    <div className="space-y-4">
      <ResourcePanel title="Target audience">
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          {(Object.keys(AUDIENCE_LABELS) as Audience[]).map((key) => (
            <div key={key} className="rounded-sm border border-slate-200 bg-slate-50/80 p-3">
              <div className="text-xs font-semibold text-slate-900">{AUDIENCE_LABELS[key]}</div>
              <p className="mt-1 text-[11px] leading-snug text-slate-600">{AUDIENCE_USE_CASES[key]}</p>
              <code className="mt-2 block text-[10px] text-slate-500">{key}</code>
            </div>
          ))}
        </div>
      </ResourcePanel>

      <ResourcePanel title="Display locations">
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
          Pick one or more surfaces when creating an announcement. Same row can sync to push via notification templates.
        </p>
        <ul className="space-y-2 p-3 text-sm text-slate-700">
          {(Object.keys(LOCATION_LABELS) as DisplayLocation[]).map((key) => (
            <li key={key}>
              <strong className="text-slate-900">{LOCATION_LABELS[key]}</strong> — {LOCATION_EXAMPLES[key]}
            </li>
          ))}
        </ul>
      </ResourcePanel>
    </div>
  );
}
