import { apiGet } from '@/lib/apiClient';
import type { ActivityLogRow } from '@/lib/logsMonitoringModels';

type Envelope<T> = { success?: boolean; data: T; meta?: unknown; message?: string };

export async function fetchAdminData<T>(path: string): Promise<T> {
  const body = await apiGet<Envelope<T>>(path);
  return body.data;
}

export type PlatformOverviewMetrics = {
  totalTenants: number;
  activeTenants: number;
  newTenantsToday: number;
  newBuildsToday: number;
  productsAddedToday: number;
  notificationsSentToday: number;
  totalOrders: number;
  ordersToday: number;
  totalProducts: number;
  totalCustomers: number;
};

export type ChartPoint = { label: string; value: number };

export type TenantAnalyticsRow = {
  id: string;
  name: string;
  industry: string;
  plan: string;
  country: string;
  active: boolean;
  orders: number;
  products: number;
};

export async function fetchPlatformOverview(): Promise<{
  overview: PlatformOverviewMetrics;
  tenantGrowth: ChartPoint[];
  orderTrend: ChartPoint[];
}> {
  const body = await apiGet<Envelope<{
    overview: PlatformOverviewMetrics;
    tenantGrowth: ChartPoint[];
    orderTrend: ChartPoint[];
  }>>('/admin/analytics/overview');
  return body.data;
}

export async function fetchTenantAnalytics(): Promise<TenantAnalyticsRow[]> {
  const body = await apiGet<Envelope<TenantAnalyticsRow[]>>('/admin/analytics/tenants');
  return body.data ?? [];
}

export async function fetchActivityLogs(limit = 200): Promise<ActivityLogRow[]> {
  const body = await apiGet<Envelope<ActivityLogRow[]>>(`/admin/logs/activity?limit=${limit}`);
  return body.data ?? [];
}

export type SystemActivityItem = ActivityLogRow & {
  category: 'tenant' | 'admin' | 'system' | 'security';
  eventType: string;
  tenantId: string | null;
  tenantName: string | null;
  message: string;
};

export async function fetchSystemActivity(limit = 500): Promise<{
  events: SystemActivityItem[];
  stats: Pick<
    PlatformOverviewMetrics,
    'newTenantsToday' | 'newBuildsToday' | 'productsAddedToday' | 'notificationsSentToday'
  >;
}> {
  const [events, overview] = await Promise.all([
    fetchActivityLogs(limit) as Promise<SystemActivityItem[]>,
    fetchPlatformOverview(),
  ]);
  return {
    events,
    stats: {
      newTenantsToday: overview.overview.newTenantsToday,
      newBuildsToday: overview.overview.newBuildsToday,
      productsAddedToday: overview.overview.productsAddedToday,
      notificationsSentToday: overview.overview.notificationsSentToday,
    },
  };
}
