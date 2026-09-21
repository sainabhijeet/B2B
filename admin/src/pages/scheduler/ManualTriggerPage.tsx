import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useScheduler } from '@/components/scheduler/SchedulerContext';

const ONE_OFF: { label: string; module: string }[] = [
  { label: 'Clean Old Logs', module: 'Infrastructure' },
  { label: 'Retry Failed Builds', module: 'Build Manager' },
];

export function ManualTriggerPage() {
  const { jobs, manualTrigger, runJobNow } = useScheduler();

  return (
    <ResourcePanel title="Manual trigger">
      <div className="space-y-6 p-3">
        <div>
          <h3 className="text-xs font-semibold text-slate-800">Registered schedules</h3>
          <p className="mt-1 text-[11px] text-slate-600">Fire the same job as “Run now” on the scheduled jobs tab.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {jobs
              .filter((j) => j.status !== 'disabled')
              .map((j) => (
                <button key={j.jobId} type="button" className={adminBtnSecondary} onClick={() => runJobNow(j)}>
                  Run now → {j.jobName}
                </button>
              ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-800">One-off maintenance</h3>
          <p className="mt-1 text-[11px] text-slate-600">Run registered maintenance operations immediately.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ONE_OFF.map((o) => (
              <button
                key={o.label}
                type="button"
                className={adminBtnPrimary}
                onClick={() => manualTrigger(o.label, o.module)}
              >
                Run now → {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ResourcePanel>
  );
}
