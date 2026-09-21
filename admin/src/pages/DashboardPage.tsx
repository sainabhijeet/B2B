import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import {
  fetchAdminData,
  fetchPlatformOverview,
  fetchTenantAnalytics,
  type PlatformOverviewMetrics,
  type TenantAnalyticsRow,
} from '@/lib/adminConsoleApi';

type BuildSummary = { summary: { totalBuildsWeek: number; failedBuilds: number } };
type UsageSummary = { snapshot: { apiRequestsToday: number; activeUsers: number } };

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

export function DashboardPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [tenants, setTenants] = useState<TenantAnalyticsRow[]>([]);
  const [builds, setBuilds] = useState<BuildSummary['summary']>({ totalBuildsWeek: 0, failedBuilds: 0 });
  const [usage, setUsage] = useState<UsageSummary['snapshot']>({ apiRequestsToday: 0, activeUsers: 0 });

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchPlatformOverview(),
      fetchTenantAnalytics(),
      fetchAdminData<BuildSummary>('/admin/analytics/builds'),
      fetchAdminData<UsageSummary>('/admin/analytics/usage'),
    ])
      .then(([platform, tenantRows, buildState, usageState]) => {
        if (!alive) return;
        setOverview(platform.overview);
        setTenants(tenantRows.slice(0, 8));
        setBuilds(buildState.summary);
        setUsage(usageState.snapshot);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const stats = [
    ['Total tenants', overview.totalTenants.toLocaleString()],
    ['Active', overview.activeTenants.toLocaleString()],
    ['New today', overview.newTenantsToday.toLocaleString()],
    ['Orders today', overview.ordersToday.toLocaleString()],
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Platform snapshot and recent tenant activity." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-sm border border-slate-200 bg-white px-3 py-3">
            <div className="text-[10px] font-semibold uppercase text-slate-500">{label}</div>
            <div className="text-lg font-semibold tabular-nums text-slate-900">{value}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ResourcePanel title="Recent tenants">
          <DataTable
            columns={[
              { id: 'b', header: 'Business', cell: (row: TenantAnalyticsRow) => row.name },
              { id: 'p', header: 'Plan', cell: (row: TenantAnalyticsRow) => row.plan },
              { id: 'o', header: 'Orders', cell: (row: TenantAnalyticsRow) => row.orders },
            ]}
            rows={tenants}
            rowKey={(row: TenantAnalyticsRow) => row.id}
            onRowClick={(row: TenantAnalyticsRow) => navigate(`/tenants/${row.id}/overview`)}
          />
        </ResourcePanel>
        <ResourcePanel title="Operations">
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <Metric label="Builds (7d)" value={builds.totalBuildsWeek} />
            <Metric label="Failed builds" value={builds.failedBuilds} />
            <Metric label="API requests today" value={usage.apiRequestsToday} />
            <Metric label="Active users" value={usage.activeUsers} />
          </div>
        </ResourcePanel>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-slate-100 pb-2">
      <div className="text-[10px] font-semibold uppercase text-slate-500">{label}</div>
      <div className="text-xl font-semibold tabular-nums text-slate-900">{value.toLocaleString()}</div>
    </div>
  );
}
