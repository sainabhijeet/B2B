import { useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { fetchTenantAnalytics, type TenantAnalyticsRow } from '@/lib/adminConsoleApi';

const allOption = 'All';
const sel = 'rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800';

export function TenantAnalyticsPage() {
  const [industry, setIndustry] = useState(allOption);
  const [plan, setPlan] = useState(allOption);
  const [country, setCountry] = useState(allOption);
  const [rows, setRows] = useState<TenantAnalyticsRow[]>([]);

  useEffect(() => {
    let alive = true;
    fetchTenantAnalytics()
      .then((data) => {
        if (alive) setRows(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const industries = useMemo(() => [allOption, ...new Set(rows.map((r) => r.industry))], [rows]);
  const plans = useMemo(() => [allOption, ...new Set(rows.map((r) => r.plan))], [rows]);
  const countries = useMemo(() => [allOption, ...new Set(rows.map((r) => r.country))], [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (industry !== allOption && r.industry !== industry) return false;
      if (plan !== allOption && r.plan !== plan) return false;
      if (country !== allOption && r.country !== country) return false;
      return true;
    });
  }, [rows, industry, plan, country]);

  const top = useMemo(
    () => [...filtered].filter((r) => r.active).sort((a, b) => b.orders - a.orders)[0],
    [filtered],
  );
  const inactiveCount = useMemo(() => filtered.filter((r) => !r.active).length, [filtered]);

  return (
    <div className="space-y-4">
      <ResourcePanel
        title="Filters"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <select className={sel} value={industry} onChange={(e) => setIndustry(e.target.value)}>
              {industries.map((x) => (
                <option key={x} value={x}>
                  Industry: {x}
                </option>
              ))}
            </select>
            <select className={sel} value={plan} onChange={(e) => setPlan(e.target.value)}>
              {plans.map((x) => (
                <option key={x} value={x}>
                  Plan: {x}
                </option>
              ))}
            </select>
            <select className={sel} value={country} onChange={(e) => setCountry(e.target.value)}>
              {countries.map((x) => (
                <option key={x} value={x}>
                  Country: {x}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="grid gap-3 p-3 sm:grid-cols-3">
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Top active tenant</div>
            <div className="text-sm font-semibold text-slate-900">{top?.name ?? '-'}</div>
            <div className="text-[10px] text-slate-500">
              Orders: {top ? top.orders.toLocaleString() : '-'}
            </div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Inactive (filtered)</div>
            <div className="text-xl font-semibold tabular-nums">{inactiveCount}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Rows shown</div>
            <div className="text-xl font-semibold tabular-nums">{filtered.length}</div>
          </div>
        </div>
      </ResourcePanel>

      <ResourcePanel title="Tenants - orders & catalog size">
        <DataTable
          columns={[
            { id: 'name', header: 'Tenant', cell: (r) => r.name },
            { id: 'industry', header: 'Industry', cell: (r) => r.industry },
            { id: 'plan', header: 'Plan', cell: (r) => r.plan },
            { id: 'country', header: 'Country', cell: (r) => r.country },
            {
              id: 'active',
              header: 'Status',
              cell: (r) => (
                <span className={r.active ? 'text-emerald-700' : 'text-amber-700'}>
                  {r.active ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            {
              id: 'orders',
              header: 'Orders',
              cell: (r) => r.orders.toLocaleString(),
              className: 'tabular-nums',
            },
            {
              id: 'products',
              header: 'Products',
              cell: (r) => r.products.toLocaleString(),
              className: 'tabular-nums',
            },
          ]}
          rows={[...filtered].sort((a, b) => b.orders - a.orders)}
          rowKey={(r) => r.id}
        />
      </ResourcePanel>
    </div>
  );
}
