export type ActivityLogRow = {
  id: string;
  user: string;
  action: string;
  module: string;
  ip: string;
  timestamp: string;
};
export type ApiLogRow = {
  id: string;
  endpoint: string;
  method: string;
  status: number;
  latencyMs: number;
  tenantId: string | null;
  timestamp: string;
};
export type ErrorLogRow = {
  id: string;
  errorType: string;
  module: string;
  message: string;
  stackTrace: string;
  timestamp: string;
};
export type LoginLogRow = {
  id: string;
  user: string;
  ip: string;
  device: string;
  status: 'success' | 'failed' | 'logout';
  timestamp: string;
};
export type PlatformBuildLogRow = {
  id: string;
  buildId: string;
  tenant: string;
  status: 'queued' | 'running' | 'success' | 'failed';
  message: string;
  timestamp: string;
};
export type MonitoringAlertRow = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  at: string;
  resolved: boolean;
};
