import { useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { categoryBadgeClass, categoryLabel, type ActivityCategory } from '@/lib/systemActivityModels';
import type { SystemActivityItem } from '@/lib/adminConsoleApi';
import { useSystemActivity } from '@/hooks/useSystemActivity';

const sel =
  'rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800';

const CATEGORY_OPTIONS: { value: 'all' | ActivityCategory | 'tenant_group' | 'admin_group' | 'system_group' | 'security_group'; label: string }[] = [
  { value: 'all', label: 'All activity' },
  { value: 'tenant_group', label: 'Tenant events' },
  { value: 'admin_group', label: 'Admin events' },
  { value: 'system_group', label: 'System events' },
  { value: 'security_group', label: 'Security events' },
  { value: 'tenant', label: 'Type: Tenant' },
  { value: 'admin', label: 'Type: Admin' },
  { value: 'system', label: 'Type: System' },
  { value: 'security', label: 'Type: Security' },
];

function matchesCategoryFilter(item: SystemActivityItem, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'tenant_group') return item.category === 'tenant';
  if (filter === 'admin_group') return item.category === 'admin';
  if (filter === 'system_group') return item.category === 'system';
  if (filter === 'security_group') return item.category === 'security';
  return item.category === filter;
}

function fmtTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}

function ActivityCard({ item }: { item: SystemActivityItem }) {
  return (
    <div className="relative pl-8">
      <span
        className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-indigo-500 shadow-sm ring-2 ring-slate-100"
        aria-hidden
      />
      <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${categoryBadgeClass(item.category)}`}
          >
            {categoryLabel(item.category)}
          </span>
          <span className="font-mono text-[10px] text-slate-500">{item.eventType}</span>
          <span className="ml-auto font-mono text-[10px] text-slate-500">{fmtTime(item.timestamp)}</span>
        </div>
        <p className="mt-1.5 text-sm font-medium text-slate-900">{item.message}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-600">
          <span>
            <span className="font-semibold text-slate-500">Module</span> · {item.module}
          </span>
          {item.user ? (
            <span>
              <span className="font-semibold text-slate-500">User</span> · {item.user}
            </span>
          ) : null}
          {item.tenantName ? (
            <span>
              <span className="font-semibold text-slate-500">Tenant</span> · {item.tenantName}
            </span>
          ) : null}
          {item.ip ? (
            <span>
              <span className="font-semibold text-slate-500">IP</span> ·{' '}
              <span className="font-mono">{item.ip}</span>
            </span>
          ) : null}
        </div>
        <div className="mt-1 font-mono text-[10px] text-slate-400">{item.id}</div>
      </div>
    </div>
  );
}

export function ActivityFeedPage() {
  const { events, stats, modules, loading, error } = useSystemActivity();
  const [cat, setCat] = useState<string>('all');
  const [module, setModule] = useState('All');
  const [tenantQ, setTenantQ] = useState('');
  const [userQ, setUserQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(() => {
    return events.filter((item) => {
      if (!matchesCategoryFilter(item, cat)) return false;
      if (module !== 'All' && item.module !== module) return false;
      if (tenantQ.trim()) {
        const t = `${item.tenantId ?? ''} ${item.tenantName ?? ''}`.toLowerCase();
        if (!t.includes(tenantQ.toLowerCase().trim())) return false;
      }
      if (userQ.trim()) {
        const u = item.user ?? '';
        if (!u.toLowerCase().includes(userQ.toLowerCase().trim())) return false;
      }
      const tick = new Date(item.timestamp).getTime();
      if (from && tick < new Date(from).getTime()) return false;
      if (to && tick > new Date(to).getTime() + 86400000) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [events, cat, module, tenantQ, userQ, from, to]);

  return (
    <div className="space-y-4">
      <ResourcePanel
        title="Filters"
        toolbar={
          <button
            type="button"
            className={adminBtnSecondary}
            onClick={() => {
              setCat('all');
              setModule('All');
              setTenantQ('');
              setUserQ('');
              setFrom('');
              setTo('');
            }}
          >
            Reset
          </button>
        }
      >
        <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3">
          <select className={sel} value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select className={sel} value={module} onChange={(e) => setModule(e.target.value)}>
            {modules.map((m) => (
              <option key={m} value={m}>
                Module: {m}
              </option>
            ))}
          </select>
          <input
            className={sel + ' min-w-[6rem]'}
            placeholder="Tenant…"
            value={tenantQ}
            onChange={(e) => setTenantQ(e.target.value)}
          />
          <input
            className={sel + ' min-w-[6rem]'}
            placeholder="User…"
            value={userQ}
            onChange={(e) => setUserQ(e.target.value)}
          />
          <input type="date" className={sel} value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className={sel} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </ResourcePanel>

      <ResourcePanel title="Recent events (today)">
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['New tenants', stats.newTenantsToday.toLocaleString()],
            ['New builds', stats.newBuildsToday.toLocaleString()],
            ['Products added', stats.productsAddedToday.toLocaleString()],
            ['Notifications sent', stats.notificationsSentToday.toLocaleString()],
          ].map(([label, val]) => (
            <div key={label} className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">{val}</div>
            </div>
          ))}
        </div>
      </ResourcePanel>

      <ResourcePanel
        title="Live activity feed"
        toolbar={
          <span className="text-[10px] text-slate-500">{loading ? 'Loading...' : `${events.length} audited events`}</span>
        }
      >
        <div className="relative border-t border-slate-100 p-4">
          <div
            className="absolute left-[1.15rem] top-4 bottom-4 w-px bg-slate-200"
            aria-hidden
          />
          <div className="space-y-4">
            {error ? (
              <p className="pl-8 text-sm text-red-600">{error}</p>
            ) : filtered.length === 0 ? (
              <p className="pl-8 text-sm text-slate-500">{loading ? 'Loading activity...' : 'No events match filters.'}</p>
            ) : (
              filtered.map((item) => <ActivityCard key={item.id} item={item} />)
            )}
          </div>
        </div>
      </ResourcePanel>
    </div>
  );
}
