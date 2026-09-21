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
export function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}
