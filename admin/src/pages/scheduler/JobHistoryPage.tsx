import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useScheduler } from '@/components/scheduler/SchedulerContext';
import { formatDuration, type JobHistoryRow } from '@/lib/schedulerModels';

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function JobHistoryPage() {
  const { history } = useScheduler();

  return (
    <ResourcePanel title="Job history">
      <DataTable
        columns={[
          { id: 'n', header: 'Job name', cell: (r: JobHistoryRow) => r.jobName },
          {
            id: 's',
            header: 'Status',
            cell: (r: JobHistoryRow) => (
              <span className={r.status === 'success' ? 'text-emerald-700' : 'text-red-700'}>
                {r.status === 'success' ? 'Success' : 'Failed'}
              </span>
            ),
          },
          { id: 'd', header: 'Duration', cell: (r: JobHistoryRow) => formatDuration(r.durationMs) },
          { id: 'e', header: 'Executed at', cell: (r: JobHistoryRow) => fmt(r.executedAt) },
          { id: 'r', header: 'Result', cell: (r: JobHistoryRow) => <span className="text-[11px]">{r.result}</span> },
        ]}
        rows={history}
        rowKey={(r) => r.historyId}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        <span className="font-mono">job_history</span> rows retained per retention policy (configured in worker).
      </p>
    </ResourcePanel>
  );
}
