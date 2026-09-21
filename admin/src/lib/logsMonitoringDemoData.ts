/** Demo log rows — replace with API queries to activity_logs, api_logs, error_logs, etc. */

export type ActivityLogRow = {
  id: string;
  user: string;
  action: string;
  module: string;
  ip: string;
  timestamp: string;
};

export const ACTIVITY_LOG_MODULES = [
  'All',
  'Tenants',
  'Subscriptions',
  'Catalog',
  'Themes',
  'Ads',
  'Build',
  'Auth',
];

export const ACTIVITY_LOG_ROWS: ActivityLogRow[] = [
  {
    id: 'act-1001',
    user: 'admin@platform.com',
    action: 'Plan updated',
    module: 'Subscriptions',
    ip: '203.0.113.10',
    timestamp: '2026-04-10T12:34:00+05:30',
  },
  {
    id: 'act-1002',
    user: 'admin@platform.com',
    action: 'Tenant created',
    module: 'Tenants',
    ip: '203.0.113.10',
    timestamp: '2026-04-10T11:20:00+05:30',
  },
  {
    id: 'act-1003',
    user: 'support@platform.com',
    action: 'Category added',
    module: 'Catalog',
    ip: '198.51.100.2',
    timestamp: '2026-04-10T10:05:00+05:30',
  },
  {
    id: 'act-1004',
    user: 'admin@platform.com',
    action: 'Theme package uploaded',
    module: 'Themes',
    ip: '203.0.113.10',
    timestamp: '2026-04-09T18:44:00+05:30',
  },
  {
    id: 'act-1005',
    user: 'admin@platform.com',
    action: 'Ad campaign created',
    module: 'Ads',
    ip: '203.0.113.10',
    timestamp: '2026-04-09T16:12:00+05:30',
  },
];

export type ApiLogRow = {
  id: string;
  endpoint: string;
  method: string;
  status: number;
  latencyMs: number;
  tenantId: string | null;
  timestamp: string;
};

export const API_LOG_ROWS: ApiLogRow[] = [
  {
    id: 'api-501',
    endpoint: '/api/v1/orders',
    method: 'POST',
    status: 200,
    latencyMs: 120,
    tenantId: 'ten-abc-001',
    timestamp: '2026-04-10T12:40:02Z',
  },
  {
    id: 'api-502',
    endpoint: '/api/v1/catalog/products',
    method: 'GET',
    status: 200,
    latencyMs: 45,
    tenantId: 'ten-abc-001',
    timestamp: '2026-04-10T12:39:58Z',
  },
  {
    id: 'api-503',
    endpoint: '/api/v1/payments/webhook',
    method: 'POST',
    status: 500,
    latencyMs: 890,
    tenantId: null,
    timestamp: '2026-04-10T12:38:11Z',
  },
  {
    id: 'api-504',
    endpoint: '/api/v1/tenants',
    method: 'GET',
    status: 403,
    latencyMs: 12,
    tenantId: null,
    timestamp: '2026-04-10T12:35:00Z',
  },
];

export type ErrorLogRow = {
  id: string;
  errorType: string;
  module: string;
  message: string;
  stackTrace: string;
  timestamp: string;
};

export const ERROR_LOG_ROWS: ErrorLogRow[] = [
  {
    id: 'err-301',
    errorType: 'Database',
    module: 'Orders',
    message: 'Connection timeout to primary replica',
    stackTrace:
      'Error: Connection terminated unexpectedly\n  at Pool.query (pg-pool/index.js:42)\n  at OrdersService.create (orders.service.ts:118)',
    timestamp: '2026-04-10T12:21:00Z',
  },
  {
    id: 'err-302',
    errorType: 'Build',
    module: 'Build worker',
    message: 'Gradle task :app:compileDebug failed — missing NDK',
    stackTrace: 'FAILURE: Build failed with an exception.\n* What went wrong:\nExecution failed for task...',
    timestamp: '2026-04-10T11:55:00Z',
  },
  {
    id: 'err-303',
    errorType: 'API',
    module: 'Payments',
    message: 'Razorpay webhook signature mismatch',
    stackTrace: 'UnauthorizedError: invalid signature\n  at verifyWebhook (billing.util.ts:88)',
    timestamp: '2026-04-10T10:10:00Z',
  },
];

export type LoginLogRow = {
  id: string;
  user: string;
  ip: string;
  device: string;
  status: 'success' | 'failed' | 'logout';
  timestamp: string;
};

export const LOGIN_LOG_ROWS: LoginLogRow[] = [
  {
    id: 'login-201',
    user: 'admin@platform.com',
    ip: '192.168.1.4',
    device: 'Chrome · macOS',
    status: 'success',
    timestamp: '2026-04-10T12:30:00Z',
  },
  {
    id: 'login-202',
    user: 'unknown@evil.test',
    ip: '198.51.100.99',
    device: 'curl/8.0',
    status: 'failed',
    timestamp: '2026-04-10T12:28:00Z',
  },
  {
    id: 'login-203',
    user: 'admin@platform.com',
    ip: '192.168.1.4',
    device: 'Chrome · macOS',
    status: 'logout',
    timestamp: '2026-04-10T09:00:00Z',
  },
];

export type PlatformBuildLogRow = {
  id: string;
  buildId: string;
  tenant: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  message: string;
  timestamp: string;
};

export const PLATFORM_BUILD_LOG_ROWS: PlatformBuildLogRow[] = [
  {
    id: 'plog-401',
    buildId: 'bld-231',
    tenant: 'Acme Distributors',
    status: 'failed',
    message: 'Gradle error: Execution failed for task :app:compileDebugKotlin',
    timestamp: '2026-04-10T12:15:00Z',
  },
  {
    id: 'plog-402',
    buildId: 'bld-232',
    tenant: 'Metro Foods',
    status: 'running',
    message: 'Dependencies install — flutter pub get',
    timestamp: '2026-04-10T12:18:00Z',
  },
  {
    id: 'plog-403',
    buildId: 'bld-230',
    tenant: 'Northwind Traders',
    status: 'success',
    message: 'Artifact uploaded — web bundle v1.2.0',
    timestamp: '2026-04-10T12:00:00Z',
  },
  {
    id: 'plog-404',
    buildId: 'bld-229',
    tenant: 'Acme Distributors',
    status: 'success',
    message: 'Build start — queue accepted',
    timestamp: '2026-04-10T11:58:00Z',
  },
];

export const MONITORING_CPU_SERIES: { label: string; value: number }[] = [
  { label: '-45m', value: 42 },
  { label: '-40m', value: 48 },
  { label: '-35m', value: 52 },
  { label: '-30m', value: 54 },
  { label: '-25m', value: 51 },
  { label: '-20m', value: 58 },
  { label: '-15m', value: 55 },
  { label: '-10m', value: 53 },
  { label: '-5m', value: 54 },
];

export const MONITORING_MEM_SERIES: { label: string; value: number }[] = [
  { label: '-45m', value: 62 },
  { label: '-40m', value: 64 },
  { label: '-35m', value: 65 },
  { label: '-30m', value: 68 },
  { label: '-25m', value: 67 },
  { label: '-20m', value: 69 },
  { label: '-15m', value: 66 },
  { label: '-10m', value: 67 },
  { label: '-5m', value: 68 },
];

export const MONITORING_QUEUE_SERIES: { label: string; value: number }[] = [
  { label: '-30m', value: 3 },
  { label: '-25m', value: 5 },
  { label: '-20m', value: 7 },
  { label: '-15m', value: 6 },
  { label: '-10m', value: 5 },
  { label: '-5m', value: 5 },
];

export type MonitoringAlertRow = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  at: string;
  resolved: boolean;
};

export const MONITORING_ALERT_ROWS: MonitoringAlertRow[] = [
  {
    id: 'mal-1',
    severity: 'critical',
    title: 'Build worker down',
    message: 'worker-us-east-2 last heartbeat 12m ago',
    at: '2026-04-10 12:18',
    resolved: false,
  },
  {
    id: 'mal-2',
    severity: 'warning',
    title: 'Server overload',
    message: 'API tier p95 latency > 800ms for 5m',
    at: '2026-04-10 12:05',
    resolved: false,
  },
  {
    id: 'mal-3',
    severity: 'warning',
    title: 'API rate limit burst',
    message: 'tenant t-883 exceeded 80% burst on /catalog',
    at: '2026-04-10 11:40',
    resolved: true,
  },
  {
    id: 'mal-4',
    severity: 'info',
    title: 'Database failover drill',
    message: 'Read replica promotion simulated — OK',
    at: '2026-04-10 08:00',
    resolved: true,
  },
];
