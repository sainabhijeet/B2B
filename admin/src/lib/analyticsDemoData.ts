/** Demo analytics for Super Admin dashboards — replace with API aggregations later. */

export const PLATFORM_OVERVIEW = {
  totalTenants: 124,
  activeTenants: 98,
  newTenantsToday: 6,
  totalOrders: 1_240_000,
  ordersToday: 2340,
  totalProducts: 58_400,
  totalCustomers: 892_000,
};

/** Monthly points for charts (label + value). */
export const NEW_TENANTS_GROWTH_SERIES: { label: string; value: number }[] = [
  { label: 'May', value: 8 },
  { label: 'Jun', value: 11 },
  { label: 'Jul', value: 9 },
  { label: 'Aug', value: 14 },
  { label: 'Sep', value: 12 },
  { label: 'Oct', value: 18 },
  { label: 'Nov', value: 15 },
  { label: 'Dec', value: 22 },
  { label: 'Jan', value: 19 },
  { label: 'Feb', value: 24 },
  { label: 'Mar', value: 21 },
  { label: 'Apr', value: 26 },
];

export const ORDERS_TREND_SERIES: { label: string; value: number }[] = [
  { label: 'W1', value: 5200 },
  { label: 'W2', value: 6100 },
  { label: 'W3', value: 5800 },
  { label: 'W4', value: 7200 },
  { label: 'W5', value: 6900 },
  { label: 'W6', value: 8100 },
  { label: 'W7', value: 7800 },
  { label: 'W8', value: 8500 },
];

export type TenantAnalyticRow = {
  id: string;
  name: string;
  industry: string;
  plan: string;
  country: string;
  orders: number;
  products: number;
  active: boolean;
};

export const TENANT_ANALYTIC_ROWS: TenantAnalyticRow[] = [
  {
    id: 't1',
    name: 'ABC Distributor',
    industry: 'Industrial',
    plan: 'Premium',
    country: 'India',
    orders: 4500,
    products: 3200,
    active: true,
  },
  {
    id: 't2',
    name: 'Metro Foods',
    industry: 'Retail',
    plan: 'Basic',
    country: 'India',
    orders: 2100,
    products: 890,
    active: true,
  },
  {
    id: 't3',
    name: 'Northwind Traders',
    industry: 'Footwear',
    plan: 'Free',
    country: 'UAE',
    orders: 340,
    products: 120,
    active: true,
  },
  {
    id: 't4',
    name: 'Paused Shop Co',
    industry: 'Retail',
    plan: 'Basic',
    country: 'India',
    orders: 12,
    products: 45,
    active: false,
  },
  {
    id: 't5',
    name: 'TechVault B2B',
    industry: 'Electronics',
    plan: 'Premium',
    country: 'USA',
    orders: 8900,
    products: 5600,
    active: true,
  },
];

export const USAGE_SNAPSHOT = {
  apiRequestsToday: 450_000,
  apiRequestsWeek: 2_900_000,
  storageUsedTb: 2.1,
  storageLimitTb: 8,
  notificationsSentToday: 128_400,
  activeUsers: 24_500,
};

export const API_USAGE_SERIES: { label: string; value: number }[] = [
  { label: 'Mon', value: 380 },
  { label: 'Tue', value: 410 },
  { label: 'Wed', value: 450 },
  { label: 'Thu', value: 420 },
  { label: 'Fri', value: 490 },
  { label: 'Sat', value: 310 },
  { label: 'Sun', value: 280 },
];

export const STORAGE_GROWTH_SERIES: { label: string; value: number }[] = [
  { label: 'Jan', value: 1.2 },
  { label: 'Feb', value: 1.35 },
  { label: 'Mar', value: 1.48 },
  { label: 'Apr', value: 1.62 },
  { label: 'May', value: 1.78 },
  { label: 'Jun', value: 1.95 },
  { label: 'Jul', value: 2.1 },
];

export const REVENUE_ANALYTICS = {
  monthlyInr: 245_000,
  annualInr: 2_820_000,
  renewalRatePercent: 87,
  planFreePercent: 65,
  planBasicPercent: 25,
  planPremiumPercent: 10,
};

export const REVENUE_GROWTH_SERIES: { label: string; value: number }[] = [
  { label: 'Q1', value: 680 },
  { label: 'Q2', value: 720 },
  { label: 'Q3', value: 810 },
  { label: 'Q4', value: 890 },
];

export const BUILD_ANALYTICS_SUMMARY = {
  buildsToday: 42,
  totalBuildsWeek: 286,
  successfulBuilds: 268,
  failedBuilds: 18,
  successRatePercent: 94,
  avgBuildTimeSec: 200,
};

export const BUILD_TREND_SERIES: { label: string; value: number }[] = [
  { label: 'M', value: 38 },
  { label: 'T', value: 44 },
  { label: 'W', value: 41 },
  { label: 'T', value: 39 },
  { label: 'F', value: 48 },
  { label: 'S', value: 22 },
  { label: 'S', value: 18 },
];

export const BUILD_FAILURE_SERIES: { label: string; value: number }[] = [
  { label: 'Timeout', value: 7 },
  { label: 'Deps', value: 5 },
  { label: 'Signing', value: 4 },
  { label: 'Other', value: 2 },
];

export const ADS_ANALYTICS_SNAPSHOT = {
  impressions: 120_000,
  clicks: 3500,
  ctrPercent: 2.9,
  revenueFromAdsInr: 48_000,
};

export const SYSTEM_HEALTH = {
  cpuPercent: 54,
  memoryPercent: 68,
  queueLength: 5,
  activeWorkers: 4,
  diskPercent: 62,
  requestsPerSec: 420,
};

export type PlatformAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  at: string;
};

export const PLATFORM_ALERTS: PlatformAlert[] = [
  {
    id: 'a1',
    severity: 'critical',
    title: 'Build worker offline',
    message: 'worker-us-east-2 not heartbeating for 6m — queue may back up.',
    at: '2026-04-10 12:18',
  },
  {
    id: 'a2',
    severity: 'warning',
    title: 'Build failures spike',
    message: '7 failed Android builds in the last hour (signing step).',
    at: '2026-04-10 11:55',
  },
  {
    id: 'a3',
    severity: 'warning',
    title: 'API rate limit nearing',
    message: 'Tenant t-883 exceeded 80% of burst quota on /catalog.',
    at: '2026-04-10 11:40',
  },
  {
    id: 'a4',
    severity: 'info',
    title: 'Server load elevated',
    message: 'API tier cpu_avg 72% for 15m — autoscale policy engaged.',
    at: '2026-04-10 10:22',
  },
];
