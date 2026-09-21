import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { useScheduler } from '@/components/scheduler/SchedulerContext';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function SchedulerSettingsPage() {
  const { settings, setSettings } = useScheduler();

  return (
    <ResourcePanel title="Scheduler settings">
      <div className="grid max-w-xl gap-3 p-3 sm:grid-cols-2">
        <div>
          <label className={setLbl}>Max workers</label>
          <input
            type="number"
            className={setInp}
            min={1}
            value={settings.maxWorkers}
            onChange={(e) => setSettings((s) => ({ ...s, maxWorkers: Number(e.target.value) || 1 }))}
          />
        </div>
        <div>
          <label className={setLbl}>Retry attempts</label>
          <input
            type="number"
            className={setInp}
            min={0}
            value={settings.retryAttempts}
            onChange={(e) => setSettings((s) => ({ ...s, retryAttempts: Number(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <label className={setLbl}>Job timeout (seconds)</label>
          <input
            type="number"
            className={setInp}
            min={1}
            value={settings.jobTimeoutSeconds}
            onChange={(e) => setSettings((s) => ({ ...s, jobTimeoutSeconds: Number(e.target.value) || 1 }))}
          />
        </div>
        <div>
          <label className={setLbl}>Queue poll interval (seconds)</label>
          <input
            type="number"
            className={setInp}
            min={1}
            value={settings.queueIntervalSeconds}
            onChange={(e) => setSettings((s) => ({ ...s, queueIntervalSeconds: Number(e.target.value) || 1 }))}
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button" className={adminBtnPrimary} onClick={() => window.alert('Settings saved.')}>
          Save settings
        </button>
      </div>
      <p className="px-3 py-2 text-[10px] text-slate-500">
        Applies to BullMQ workers / Celery concurrency — mirror these values in your worker env when going live.
      </p>
    </ResourcePanel>
  );
}
