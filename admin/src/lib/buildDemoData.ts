export type BuildJobStatus = 'queued' | 'building' | 'completed' | 'failed';

export type BuildPriority = 'low' | 'medium' | 'high';

export type BuildQueueRow = {
  id: string;
  tenantName: string;
  buildType: string;
  plan: string;
  priority: BuildPriority;
  status: BuildJobStatus;
  queuedAt: string;
};

export type BuildHistoryRow = {
  id: string;
  tenant: string;
  appVersion: string;
  buildType: string;
  status: BuildJobStatus;
  durationSec: number;
  completedAt: string;
};

export const BUILD_DASHBOARD_STATS = {
  buildsToday: 34,
  activeBuilds: 3,
  failedBuilds: 2,
  queueLength: 5,
  workersRunning: 3,
};

export const BUILD_QUEUE_ROWS: BuildQueueRow[] = [
  {
    id: 'job-1',
    tenantName: 'Acme Distributors',
    buildType: 'Flutter APK',
    plan: 'Premium',
    priority: 'high',
    status: 'building',
    queuedAt: '2026-04-10 12:01:22',
  },
  {
    id: 'job-2',
    tenantName: 'Northwind Traders',
    buildType: 'AAB release',
    plan: 'Basic',
    priority: 'medium',
    status: 'queued',
    queuedAt: '2026-04-10 12:05:01',
  },
  {
    id: 'job-pending-3',
    tenantName: 'Metro Foods',
    buildType: 'Web bundle',
    plan: 'Free',
    priority: 'low',
    status: 'queued',
    queuedAt: '2026-04-10 12:08:44',
  },
];

export const BUILD_HISTORY_ROWS: BuildHistoryRow[] = [
  {
    id: 'job-88',
    tenant: 'Acme Distributors',
    appVersion: '1.4.1',
    buildType: 'Flutter APK',
    status: 'completed',
    durationSec: 420,
    completedAt: '2026-04-09 18:22:00',
  },
  {
    id: 'job-87',
    tenant: 'Paused Shop Co',
    appVersion: '1.0.0',
    buildType: 'Flutter APK',
    status: 'failed',
    durationSec: 95,
    completedAt: '2026-04-09 09:10:00',
  },
  {
    id: 'b1',
    tenant: 'Acme Distributors',
    appVersion: '1.4.2',
    buildType: 'AAB',
    status: 'completed',
    durationSec: 512,
    completedAt: '2026-04-08 14:22:00',
  },
  {
    id: 'b2',
    tenant: 'Acme Distributors',
    appVersion: '1.4.1',
    buildType: 'Staging APK',
    status: 'failed',
    durationSec: 40,
    completedAt: '2026-04-07 11:05:00',
  },
  {
    id: 'job-85',
    tenant: 'Urban Fashion Hub',
    appVersion: '2.1.0',
    buildType: 'Web bundle',
    status: 'completed',
    durationSec: 180,
    completedAt: '2026-04-06 16:00:00',
  },
];

const DEFAULT_LOG_LINES = [
  '[12:01:00] Checkout source (tenant branch)',
  '[12:01:12] Install dependencies · flutter pub get',
  '[12:02:40] Compile assets',
  '[12:04:10] flutter build apk --release',
  '[12:06:55] Gradle assembleRelease',
  '[12:07:40] APK generated · upload to artifact store',
];

const FAILED_LOG_LINES = [
  '[09:05:00] Install dependencies',
  '[09:06:12] flutter build apk --release',
  '[09:07:10] ERROR: Gradle build failed',
  '[09:07:11] Missing asset: assets/icon_missing.png',
  '[09:07:15] Build aborted',
];

export function getBuildLogLines(buildId: string | undefined): string[] {
  if (!buildId) return DEFAULT_LOG_LINES;
  if (buildId === 'job-87' || buildId === 'b2') return FAILED_LOG_LINES;
  return DEFAULT_LOG_LINES;
}

export const BUILD_WORKERS = [
  { id: 'w-1', name: 'worker-ap-south-1a', status: 'active', cpuPct: 62, memPct: 71 },
  { id: 'w-2', name: 'worker-ap-south-1b', status: 'active', cpuPct: 45, memPct: 55 },
  { id: 'w-3', name: 'worker-ap-south-1c', status: 'active', cpuPct: 38, memPct: 48 },
  { id: 'w-4', name: 'worker-draining', status: 'paused', cpuPct: 0, memPct: 12 },
];
