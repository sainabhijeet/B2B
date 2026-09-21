import { useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { DEFAULT_AD_SETTINGS, type AdSettingsState } from '@/lib/adsDemoData';

const STORAGE_KEY = 'saas_admin_ads_settings_local';

const lbl =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inp =
  'w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs';

export function AdsSettingsPage() {
  const [form, setForm] = useState<AdSettingsState>(DEFAULT_AD_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AdSettingsState;
        setForm({ ...DEFAULT_AD_SETTINGS, ...parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <ResourcePanel title="Global ad settings">
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Backend endpoint for global caps is not wired yet — values below are stored in{' '}
          <span className="font-mono">localStorage</span> for UI-only presets.
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          <div>
            <label className={lbl}>Max ads per page</label>
            <input
              type="number"
              min={1}
              className={inp}
              value={form.maxAdsPerPage}
              onChange={(e) => setForm((f) => ({ ...f, maxAdsPerPage: Number(e.target.value) || 1 }))}
            />
          </div>
          <div>
            <label className={lbl}>Ad frequency (minutes)</label>
            <input
              type="number"
              min={1}
              className={inp}
              value={form.adFrequencyMinutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, adFrequencyMinutes: Number(e.target.value) || 1 }))
              }
            />
          </div>
          <div>
            <label className={lbl}>Ad rotation</label>
            <select
              className={inp}
              value={form.adRotation}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  adRotation: e.target.value as AdSettingsState['adRotation'],
                }))
              }
            >
              <option value="round_robin">Round robin</option>
              <option value="weighted">Weighted</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Ad display rules</label>
            <input
              className={inp}
              value={form.displayRule}
              onChange={(e) => setForm((f) => ({ ...f, displayRule: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2">
          <button type="button" className={adminBtnPrimary} onClick={saveLocal}>
            Save locally
          </button>
          {saved ? <span className="text-xs text-emerald-700">Saved in browser.</span> : null}
        </div>
      </ResourcePanel>
      <p className="text-xs text-slate-500">
        Production behaviour: <strong>Free plan → ads_enabled</strong> on each tenant subscription; paid plans
        remain ad-free server-side.
      </p>
    </div>
  );
}
