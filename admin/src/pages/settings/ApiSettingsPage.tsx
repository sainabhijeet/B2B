import { useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { apiDefaults } from '@/lib/systemSettingsDefaults';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function ApiSettingsPage() {
  const [form, setForm] = useState(apiDefaults);

  return (
    <ResourcePanel title="API settings">
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={setLbl}>API base URL (public)</label>
          <input
            className={setInp}
            value={form.apiBaseUrl}
            onChange={(e) => setForm((f) => ({ ...f, apiBaseUrl: e.target.value }))}
          />
        </div>
        <div>
          <label className={setLbl}>API rate limit (requests / minute)</label>
          <input
            type="number"
            min={1}
            className={setInp}
            value={form.apiRateLimitPerMinute}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                apiRateLimitPerMinute: Number(e.target.value) || 1000,
              }))
            }
          />
        </div>
        <div>
          <label className={setLbl}>API key expiry (days)</label>
          <input
            type="number"
            min={1}
            className={setInp}
            value={form.apiKeyExpiryDays}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                apiKeyExpiryDays: Number(e.target.value) || 365,
              }))
            }
          />
        </div>
        <div className="sm:col-span-2">
          <label className={setLbl}>CORS allowed domains (comma-separated)</label>
          <textarea
            className={`${setInp} min-h-[4rem]`}
            value={form.corsAllowedDomains}
            onChange={(e) => setForm((f) => ({ ...f, corsAllowedDomains: e.target.value }))}
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button" className={adminBtnPrimary}>
          Save API settings (demo)
        </button>
      </div>
    </ResourcePanel>
  );
}
