/** Demo — maps to scheduled_jobs, job_history, job_queue. */

export type ScheduledJobStatus = 'active' | 'paused' | 'disabled';

export type ScheduledJobRow = {
  jobId: string;
  jobName: string;
  module: string;
  frequency: string;
  status: ScheduledJobStatus;
  lastRun: string | null;
  nextRun: string | null;
};

export type JobHistoryStatus = 'success' | 'failed';

export type JobHistoryRow = {
  historyId: string;
  jobId: string;
  jobName: string;
  status: JobHistoryStatus;
  durationMs: number;
  executedAt: string;
  result: string;
};

export type QueueJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type JobQueueRow = {
  queueId: string;
  jobType: string;
  status: QueueJobStatus;
  createdAt: string;
  worker: string | null;
};

export type SchedulerSettings = {
  maxWorkers: number;
  retryAttempts: number;
  jobTimeoutSeconds: number;
  queueIntervalSeconds: number;
};

export const INITIAL_SCHEDULED_JOBS: ScheduledJobRow[] = [
  {
    jobId: 'sj-1',
    jobName: 'Send Subscription Expiry Alerts',
    module: 'Billing',
    frequency: 'Daily',
    status: 'active',
    lastRun: '2026-04-10T08:00:00+05:30',
    nextRun: '2026-04-11T08:00:00+05:30',
  },
  {
    jobId: 'sj-2',
    jobName: 'Retry Failed Builds',
    module: 'Build Manager',
    frequency: 'Every 10 minutes',
    status: 'active',
    lastRun: '2026-04-10T12:30:00+05:30',
    nextRun: '2026-04-10T12:40:00+05:30',
  },
  {
    jobId: 'sj-3',
    jobName: 'Send Abandoned Cart Notifications',
    module: 'Marketing',
    frequency: 'Every 1 hour',
    status: 'active',
    lastRun: '2026-04-10T11:45:00+05:30',
    nextRun: '2026-04-10T12:45:00+05:30',
  },
  {
    jobId: 'sj-4',
    jobName: 'Clean Old Logs',
    module: 'Infrastructure',
    frequency: 'Daily',
    status: 'active',
    lastRun: '2026-04-10T03:00:00+05:30',
    nextRun: '2026-04-11T03:00:00+05:30',
  },
  {
    jobId: 'sj-5',
    jobName: 'Clean Old Builds',
    module: 'Build Manager',
    frequency: 'Weekly',
    status: 'paused',
    lastRun: '2026-04-07T02:00:00+05:30',
    nextRun: null,
  },
  {
    jobId: 'sj-6',
    jobName: 'Backup Database',
    module: 'Infrastructure',
    frequency: 'Daily',
    status: 'active',
    lastRun: '2026-04-10T01:00:00+05:30',
    nextRun: '2026-04-11T01:00:00+05:30',
  },
  {
    jobId: 'sj-7',
    jobName: 'Generate Analytics Reports',
    module: 'Analytics',
    frequency: 'Every 1 hour',
    status: 'active',
    lastRun: '2026-04-10T12:00:00+05:30',
    nextRun: '2026-04-10T13:00:00+05:30',
  },
  {
    jobId: 'sj-8',
    jobName: 'Sync Translations',
    module: 'Languages',
    frequency: 'Every 5 minutes',
    status: 'active',
    lastRun: '2026-04-10T12:34:00+05:30',
    nextRun: '2026-04-10T12:39:00+05:30',
  },
];

export const INITIAL_JOB_HISTORY: JobHistoryRow[] = [
  {
    historyId: 'jh-1',
    jobId: 'sj-2',
    jobName: 'Retry Failed Builds',
    status: 'success',
    durationMs: 4200,
    executedAt: '2026-04-10T12:30:00+05:30',
    result: '2 builds re-queued',
  },
  {
    historyId: 'jh-2',
    jobId: 'sj-2',
    jobName: 'Retry Failed Builds',
    status: 'failed',
    durationMs: 60000,
    executedAt: '2026-04-10T12:20:00+05:30',
    result: 'Error: Worker timeout',
  },
  {
    historyId: 'jh-3',
    jobId: 'sj-1',
    jobName: 'Send Subscription Expiry Alerts',
    status: 'success',
    durationMs: 4100,
    executedAt: '2026-04-10T08:00:00+05:30',
    result: '142 emails queued',
  },
];

export const INITIAL_JOB_QUEUE: JobQueueRow[] = [
  {
    queueId: 'jq-1',
    jobType: 'Send Push Notifications',
    status: 'processing',
    createdAt: '2026-04-10T12:35:10+05:30',
    worker: 'node-2',
  },
  {
    queueId: 'jq-2',
    jobType: 'Sync Translations',
    status: 'queued',
    createdAt: '2026-04-10T12:35:00+05:30',
    worker: null,
  },
  {
    queueId: 'jq-3',
    jobType: 'Clean Old Logs',
    status: 'completed',
    createdAt: '2026-04-10T03:00:05+05:30',
    worker: 'node-1',
  },
  {
    queueId: 'jq-4',
    jobType: 'Webhook Delivery',
    status: 'failed',
    createdAt: '2026-04-10T12:28:00+05:30',
    worker: 'node-3',
  },
];

export const DEFAULT_SCHEDULER_SETTINGS: SchedulerSettings = {
  maxWorkers: 4,
  retryAttempts: 3,
  jobTimeoutSeconds: 60,
  queueIntervalSeconds: 5,
};

export function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}
