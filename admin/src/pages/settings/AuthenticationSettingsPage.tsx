import { useCallback, useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError, apiGet, apiPut } from '@/lib/apiClient';
import { OTP_PROVIDER_LABELS } from '@/lib/otpProviderLabels';
import type { PlatformAuthSettings } from '@/lib/platformSettingsApi';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

function authPutBody(f: PlatformAuthSettings) {
  return {
    otpProvider: f.otpProvider,
    otpExpiryMinutes: f.otpExpiryMinutes,
    maxLoginAttempts: f.maxLoginAttempts,
    sessionTimeoutMinutes: f.sessionTimeoutMinutes,
  };
}

export function AuthenticationSettingsPage() {
  const [form, setForm] = useState<PlatformAuthSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiGet<PlatformAuthSettings>('/admin/platform-settings/auth');
      setForm({
        otpProvider: d.otpProvider,
        otpExpiryMinutes: Number(d.otpExpiryMinutes) || 5,
        maxLoginAttempts: Number(d.maxLoginAttempts) || 5,
        sessionTimeoutMinutes: Number(d.sessionTimeoutMinutes) || 60,
        availableOtpProviders: Array.isArray(d.availableOtpProviders) ? d.availableOtpProviders : ['firebase'],
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load settings');
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!form) return;
    setSaving(true);
    setSaveOk(false);
    setError(null);
    try {
      await apiPut('/admin/platform-settings/auth', authPutBody(form));
      setSaveOk(true);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResourcePanel title="Authentication settings">
      {error ? (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          {error}{' '}
          <button type="button" className="font-medium text-indigo-700 underline" onClick={() => void load()}>
            Retry
          </button>
        </p>
      ) : null}
      {saveOk ? (
        <p className="border-b border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
          Saved. OTP runtime reads <span className="font-mono">platform_auth_settings</span> in DB.
        </p>
      ) : null}
      {loading ? (
        <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">Loading…</p>
      ) : null}
      {!loading && form ? (
        <>
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div>
              <label className={setLbl}>OTP provider</label>
              <select
                className={setInp}
                value={form.otpProvider}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          otpProvider: e.target.value as PlatformAuthSettings['otpProvider'],
                        }
                      : f,
                  )
                }
              >
                {form.availableOtpProviders.map((id) => (
                  <option key={id} value={id}>
                    {OTP_PROVIDER_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={setLbl}>OTP expiry (minutes)</label>
              <input
                type="number"
                min={1}
                className={setInp}
                value={form.otpExpiryMinutes}
                onChange={(e) =>
                  setForm((f) =>
                    f ? { ...f, otpExpiryMinutes: Number(e.target.value) || 5 } : f,
                  )
                }
              />
            </div>
            <div>
              <label className={setLbl}>Max OTP verify attempts</label>
              <input
                type="number"
                min={1}
                className={setInp}
                value={form.maxLoginAttempts}
                onChange={(e) =>
                  setForm((f) =>
                    f ? { ...f, maxLoginAttempts: Number(e.target.value) || 5 } : f,
                  )
                }
              />
            </div>
            <div>
              <label className={setLbl}>Session timeout (minutes)</label>
              <input
                type="number"
                min={5}
                className={setInp}
                value={form.sessionTimeoutMinutes}
                onChange={(e) =>
                  setForm((f) =>
                    f
                      ? {
                          ...f,
                          sessionTimeoutMinutes: Number(e.target.value) || 60,
                        }
                      : f,
                  )
                }
              />
            </div>
          </div>
          <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
            MSG91 and Custom SMS appear only when an active SMS provider with an API key exists in Integrations → SMS.
            Session timeout is stored for future JWT / tenant policy wiring.
          </p>
        </>
      ) : null}
      <div className="border-t border-slate-100 px-3 py-2">
        <button
          type="button"
          className={adminBtnPrimary}
          disabled={saving || loading || !form}
          onClick={() => void onSave()}
        >
          {saving ? 'Saving…' : 'Save authentication settings'}
        </button>
        <button type="button" className={`${adminBtnSecondary} ml-2`} disabled={loading} onClick={() => void load()}>
          Reload
        </button>
      </div>
    </ResourcePanel>
  );
}
