import { useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { Switch } from '@/components/ui/Switch';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { maintenanceDefaults } from '@/lib/systemSettingsDefaults';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function MaintenanceSettingsPage() {
  const [form, setForm] = useState(maintenanceDefaults);

  return (
    <ResourcePanel title="Maintenance mode">
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-sm border border-amber-100 bg-amber-50/80 px-3 py-2 sm:col-span-2">
          <div>
            <div className="text-xs font-semibold text-amber-900">Enable maintenance mode</div>
            <div className="text-[10px] text-amber-800/90">
              Non–allowlisted traffic sees the maintenance message (demo only)
            </div>
          </div>
          <Switch
            checked={form.enabled}
            onChange={(next) => setForm((f) => ({ ...f, enabled: next }))}
            aria-label="Maintenance mode"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={setLbl}>Maintenance message</label>
          <textarea
            className={`${setInp} min-h-[4rem]`}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={setLbl}>Allowed IPs (comma-separated)</label>
          <input
            className={setInp}
            value={form.allowedIps}
            onChange={(e) => setForm((f) => ({ ...f, allowedIps: e.target.value }))}
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button" className={adminBtnPrimary}>
          Save maintenance settings (demo)
        </button>
      </div>
    </ResourcePanel>
  );
}
