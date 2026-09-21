import { useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { MiniBarChart, SparkLine } from '@/components/analytics/charts';
import {
  fetchPlatformOverview,
  type ChartPoint,
  type PlatformOverviewMetrics,
} from '@/lib/adminConsoleApi';

const EMPTY_OVERVIEW: PlatformOverviewMetrics = {
  totalTenants: 0,
  activeTenants: 0,
  newTenantsToday: 0,
  newBuildsToday: 0,
  productsAddedToday: 0,
  notificationsSentToday: 0,
  totalOrders: 0,
  ordersToday: 0,
  totalProducts: 0,
  totalCustomers: 0,
};

export function PlatformOverviewPage() {
  const [overview, setOverview] = useState<PlatformOverviewMetrics>(EMPTY_OVERVIEW);
  const [tenantGrowth, setTenantGrowth] = useState<ChartPoint[]>([]);
  const [orderTrend, setOrderTrend] = useState<ChartPoint[]>([]);

  useEffect(() => {
    let alive = true;
    fetchPlatformOverview()
      .then((data) => {
        if (!alive) return;
        setOverview(data.overview ?? EMPTY_OVERVIEW);
        setTenantGrowth(data.tenantGrowth ?? []);
        setOrderTrend(data.orderTrend ?? []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <ResourcePanel title="Key metrics">
        <div className="grid gap-3 p-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {(
            [
              ['Total tenants', overview.totalTenants.toLocaleString()],
              ['Active tenants', overview.activeTenants.toLocaleString()],
              ['New tenants today', overview.newTenantsToday.toLocaleString()],
              ['Total orders', overview.totalOrders.toLocaleString()],
              ['Orders today', overview.ordersToday.toLocaleString()],
              ['Total products', overview.totalProducts.toLocaleString()],
              ['Total customers', overview.totalCustomers.toLocaleString()],
            ] as const
          ).map(([label, val]) => (
            <div key={label} className="rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{val}</div>
            </div>
          ))}
        </div>
      </ResourcePanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResourcePanel title="New tenants growth">
          <div className="p-3">
            <MiniBarChart series={tenantGrowth} colorClass="bg-emerald-500" />
            <p className="mt-2 text-[10px] text-slate-500">Rolling 12 months</p>
          </div>
        </ResourcePanel>
        <ResourcePanel title="Orders trend">
          <div className="p-3">
            <SparkLine series={orderTrend} />
            <p className="mt-1 text-[10px] text-slate-500">Recent weeks - order volume</p>
          </div>
        </ResourcePanel>
      </div>
    </div>
  );
}
