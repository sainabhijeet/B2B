import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useScheduler } from '@/components/scheduler/SchedulerContext';
import type { ScheduledJobRow, ScheduledJobStatus } from '@/lib/schedulerModels';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

function fmt(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusStyle(s: ScheduledJobStatus) {
  if (s === 'active') return 'text-emerald-700';
  if (s === 'paused') return 'text-amber-800';
  return 'text-slate-500';
}

export function ScheduledJobsPage() {
  const { jobs, updateJob, setJobStatus, runJobNow } = useScheduler();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledJobRow | null>(null);
  const [jobName, setJobName] = useState('');
  const [module, setModule] = useState('');
  const [frequency, setFrequency] = useState('');

  function openEdit(row: ScheduledJobRow) {
    setEditing(row);
    setJobName(row.jobName);
    setModule(row.module);
    setFrequency(row.frequency);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    updateJob(editing.jobId, {
      jobName: jobName.trim(),
      module: module.trim(),
      frequency: frequency.trim(),
    });
    close();
  }

  return (
    <ResourcePanel title="Scheduled jobs">
      {open && editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={close}>
          <div
            className="w-full max-w-md rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <form onSubmit={onSubmit}>
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Edit job</div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl}>Job name</label>
                  <input className={setInp} value={jobName} onChange={(e) => setJobName(e.target.value)} required />
                </div>
                <div>
                  <label className={setLbl}>Module</label>
                  <input className={setInp} value={module} onChange={(e) => setModule(e.target.value)} required />
                </div>
                <div>
                  <label className={setLbl}>Frequency</label>
                  <input className={setInp} value={frequency} onChange={(e) => setFrequency(e.target.value)} required />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={close}>
                  Cancel
                </button>
                <button type="submit" className={adminBtnPrimary}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={[
          { id: 'n', header: 'Job name', cell: (r: ScheduledJobRow) => r.jobName },
          { id: 'm', header: 'Module', cell: (r: ScheduledJobRow) => r.module },
          { id: 'f', header: 'Frequency', cell: (r: ScheduledJobRow) => r.frequency },
          {
            id: 's',
            header: 'Status',
            cell: (r: ScheduledJobRow) => (
              <span className={statusStyle(r.status)}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
            ),
          },
          { id: 'lr', header: 'Last run', cell: (r: ScheduledJobRow) => fmt(r.lastRun) },
          { id: 'nr', header: 'Next run', cell: (r: ScheduledJobRow) => fmt(r.nextRun) },
          {
            id: 'a',
            header: 'Actions',
            cell: (r: ScheduledJobRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
                {r.status === 'active' ? (
                  <button type="button" className={adminBtnSecondary} onClick={() => setJobStatus(r.jobId, 'paused')}>
                    Pause
                  </button>
                ) : r.status === 'paused' ? (
                  <button type="button" className={adminBtnSecondary} onClick={() => setJobStatus(r.jobId, 'active')}>
                    Resume
                  </button>
                ) : null}
                {r.status !== 'disabled' ? (
                  <button type="button" className={adminBtnSecondary} onClick={() => setJobStatus(r.jobId, 'disabled')}>
                    Disable
                  </button>
                ) : (
                  <button type="button" className={adminBtnSecondary} onClick={() => setJobStatus(r.jobId, 'active')}>
                    Enable
                  </button>
                )}
                <button type="button" className={adminBtnPrimary} onClick={() => runJobNow(r)}>
                  Run now
                </button>
              </div>
            ),
          },
        ]}
        rows={jobs}
        rowKey={(r) => r.jobId}
      />
    </ResourcePanel>
  );
}
