import { useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { buildEnvDefaults } from '@/lib/systemSettingsDefaults';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function SystemBuildSettingsPage() {
  const [form, setForm] = useState(buildEnvDefaults);

  return (
    <ResourcePanel title="Build system settings">
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <div>
          <label className={setLbl}>Max parallel builds</label>
          <input
            type="number"
            min={1}
            className={setInp}
            value={form.maxParallelBuilds}
            onChange={(e) =>
              setForm((f) => ({ ...f, maxParallelBuilds: Number(e.target.value) || 1 }))
            }
          />
        </div>
        <div>
          <label className={setLbl}>Build timeout (minutes)</label>
          <input
            type="number"
            min={1}
            className={setInp}
            value={form.buildTimeoutMinutes}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                buildTimeoutMinutes: Number(e.target.value) || 45,
              }))
            }
          />
        </div>
        <div>
          <label className={setLbl}>Retry limit</label>
          <input
            type="number"
            min={0}
            className={setInp}
            value={form.retryLimit}
            onChange={(e) => setForm((f) => ({ ...f, retryLimit: Number(e.target.value) || 0 }))}
          />
        </div>
        <div>
          <label className={setLbl}>Artifact retention (days)</label>
          <input
            type="number"
            min={1}
            className={setInp}
            value={form.artifactRetentionDays}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                artifactRetentionDays: Number(e.target.value) || 30,
              }))
            }
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button" className={adminBtnPrimary}>
          Save build settings (demo)
        </button>
      </div>
    </ResourcePanel>
  );
}
