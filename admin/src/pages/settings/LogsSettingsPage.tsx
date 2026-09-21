import { useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { logsDefaults } from '@/lib/systemSettingsDefaults';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function LogsSettingsPage() {
  const [form, setForm] = useState(logsDefaults);

  return (
    <ResourcePanel title="System logs retention">
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <div>
          <label className={setLbl}>Error log retention (days)</label>
          <input
            type="number"
            min={1}
            className={setInp}
            value={form.errorLogRetentionDays}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                errorLogRetentionDays: Number(e.target.value) || 30,
              }))
            }
          />
        </div>
        <div>
          <label className={setLbl}>API log retention (days)</label>
          <input
            type="number"
            min={1}
            className={setInp}
            value={form.apiLogRetentionDays}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                apiLogRetentionDays: Number(e.target.value) || 14,
              }))
            }
          />
        </div>
        <div className="sm:col-span-2">
          <label className={setLbl}>Activity / audit log retention (days)</label>
          <input
            type="number"
            min={1}
            className={setInp}
            value={form.activityLogRetentionDays}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                activityLogRetentionDays: Number(e.target.value) || 90,
              }))
            }
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button" className={adminBtnPrimary}>
          Save logs settings (demo)
        </button>
      </div>
    </ResourcePanel>
  );
}
