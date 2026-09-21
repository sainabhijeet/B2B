import { useMemo } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useCoupons } from '@/components/coupons/CouponContext';

type TrendRow = { week: string; redemptions: number };
type PlanConversionRow = { plan: string; checkouts: number; withCoupon: number; rate: number };

function weekLabel(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
}

export function CouponAnalyticsPage() {
  const { analytics, usage } = useCoupons();
  const usageTrend = useMemo<TrendRow[]>(() => {
    const map = new Map<string, number>();
    for (const row of usage) {
      const label = weekLabel(row.usedAt);
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return [...map.entries()].map(([week, redemptions]) => ({ week, redemptions }));
  }, [usage]);
  const maxBar = Math.max(...usageTrend.map((d) => d.redemptions), 1);

  const planConversion = useMemo<PlanConversionRow[]>(() => {
    const map = new Map<string, number>();
    for (const row of usage) {
      map.set(row.planId || 'Unassigned', (map.get(row.planId || 'Unassigned') ?? 0) + 1);
    }
    return [...map.entries()].map(([plan, withCoupon]) => ({
      plan,
      checkouts: withCoupon,
      withCoupon,
      rate: withCoupon > 0 ? 100 : 0,
    }));
  }, [usage]);

  return (
    <div className="space-y-4">
      <ResourcePanel title="Overview">
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Redemptions</div>
            <div className="text-xl font-semibold tabular-nums">{analytics.totalRedemptions.toLocaleString()}</div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Discount given</div>
            <div className="text-xl font-semibold tabular-nums">
              Rs {analytics.totalDiscountGiven.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2 sm:col-span-2">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Revenue attributed</div>
            <div className="text-sm text-slate-600">
              Sum of attributed subscription revenue after coupon from backend rows.
            </div>
          </div>
        </div>
      </ResourcePanel>

      <ResourcePanel title="Top coupons">
        <DataTable
          columns={[
            { id: 'c', header: 'Coupon', cell: (r) => <span className="font-mono text-xs font-semibold">{r.code}</span> },
            { id: 'u', header: 'Usage', cell: (r) => r.usage.toLocaleString() },
            {
              id: 'rev',
              header: 'Revenue generated',
              cell: (r) => `Rs ${r.revenue.toLocaleString('en-IN')}`,
            },
          ]}
          rows={analytics.topCoupons}
          rowKey={(r) => r.code}
        />
      </ResourcePanel>

      <ResourcePanel title="Coupon usage trend">
        <div className="space-y-3 p-3">
          {usageTrend.map((d) => (
            <div key={d.week} className="flex items-center gap-3 text-xs">
              <span className="w-16 shrink-0 text-slate-600">{d.week}</span>
              <div className="h-6 flex-1 rounded-sm bg-slate-100">
                <div
                  className="flex h-6 items-center justify-end rounded-sm bg-indigo-500 pr-2 text-[10px] font-medium text-white"
                  style={{ width: `${(d.redemptions / maxBar) * 100}%`, minWidth: '2rem' }}
                >
                  {d.redemptions}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ResourcePanel>

      <ResourcePanel title="Plan conversion (coupon-assisted)">
        <DataTable
          columns={[
            { id: 'p', header: 'Plan', cell: (r) => r.plan },
            { id: 'ch', header: 'Checkouts', cell: (r) => r.checkouts.toLocaleString() },
            { id: 'wc', header: 'With coupon', cell: (r) => r.withCoupon.toLocaleString() },
            { id: 'rate', header: 'Rate', cell: (r) => `${r.rate}%` },
          ]}
          rows={planConversion}
          rowKey={(r) => r.plan}
        />
      </ResourcePanel>

      <ResourcePanel title="Scope reminder">
        <p className="px-3 py-3 text-xs text-slate-700">
          These metrics are for <strong>subscription</strong> coupons only. Distributor product-order coupons are
          tracked under <strong>Distributor analytics</strong> / <strong>Distributor usage</strong>.
        </p>
      </ResourcePanel>
    </div>
  );
}
