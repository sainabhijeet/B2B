import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useScheduler } from '@/components/scheduler/SchedulerContext';
import type { JobQueueRow, QueueJobStatus } from '@/lib/schedulerModels';

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusClass(s: QueueJobStatus) {
  switch (s) {
    case 'processing':
      return 'text-indigo-700';
    case 'queued':
      return 'text-slate-600';
    case 'completed':
      return 'text-emerald-700';
    case 'failed':
      return 'text-red-700';
    default:
      return 'text-slate-600';
  }
}

export function JobQueuePage() {
  const { queue } = useScheduler();
  const sorted = [...queue].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <ResourcePanel title="Job queue">
      <DataTable
        columns={[
          {
            id: 'id',
            header: 'Job ID',
            cell: (r: JobQueueRow) => <span className="font-mono text-[10px]">{r.queueId}</span>,
          },
          { id: 't', header: 'Type', cell: (r: JobQueueRow) => r.jobType },
          {
            id: 's',
            header: 'Status',
            cell: (r: JobQueueRow) => (
              <span className={statusClass(r.status)}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
            ),
          },
          { id: 'qt', header: 'Queue time', cell: (r: JobQueueRow) => fmt(r.createdAt) },
          { id: 'w', header: 'Worker', cell: (r: JobQueueRow) => r.worker ?? '—' },
        ]}
        rows={sorted}
        rowKey={(r) => r.queueId}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Reflects <span className="font-mono">job_queue</span> — workers pull by status order; stale rows purge via clean-up
        job.
      </p>
    </ResourcePanel>
  );
}
