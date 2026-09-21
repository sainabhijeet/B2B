import { apiPost } from '@/lib/apiClient';

export type AdminJobKey = 'CLEAN_OLD_LOGS' | 'RETRY_FAILED_BUILDS';

export type AdminJobRun = {
  runId: string;
  jobKey: AdminJobKey;
  status: 'success';
  durationMs: number;
  result: string;
  executedAt: string;
  queueId: string | null;
};

export async function runAdminJob(jobKey: AdminJobKey): Promise<AdminJobRun> {
  const response = await apiPost<{ data: AdminJobRun }>('/admin/scheduler/run', { jobKey });
  return response.data;
}

export function schedulerJobKey(jobName: string): AdminJobKey | null {
  const normalized = jobName.trim().toLowerCase();
  if (normalized === 'clean old logs') return 'CLEAN_OLD_LOGS';
  if (normalized === 'retry failed builds') return 'RETRY_FAILED_BUILDS';
  return null;
}
