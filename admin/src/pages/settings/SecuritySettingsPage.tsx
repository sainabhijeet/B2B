import { useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { Switch } from '@/components/ui/Switch';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { securityDefaults } from '@/lib/systemSettingsDefaults';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function SecuritySettingsPage() {
  const [form, setForm] = useState(securityDefaults);

  return (
    <ResourcePanel title="Security settings">
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-sm border border-slate-100 bg-slate-50/80 px-3 py-2 sm:col-span-2">
          <div>
            <div className="text-xs font-semibold text-slate-800">Enable 2FA for admin</div>
            <div className="text-[10px] text-slate-500">Require TOTP for super admin roles</div>
          </div>
          <Switch
            checked={form.enable2FA}
            onChange={(next) => setForm((f) => ({ ...f, enable2FA: next }))}
            aria-label="Enable 2FA"
          />
        </div>
        <div>
          <label className={setLbl}>Password min length</label>
          <input
            type="number"
            min={6}
            className={setInp}
            value={form.passwordMinLength}
            onChange={(e) =>
              setForm((f) => ({ ...f, passwordMinLength: Number(e.target.value) || 8 }))
            }
          />
        </div>
        <div>
          <label className={setLbl}>Access token expiry (hours)</label>
          <input
            type="number"
            min={1}
            className={setInp}
            value={form.tokenExpiryHours}
            onChange={(e) =>
              setForm((f) => ({ ...f, tokenExpiryHours: Number(e.target.value) || 24 }))
            }
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-sm border border-slate-100 px-3 py-2">
          <span className="text-xs font-medium text-slate-700">Require uppercase</span>
          <Switch
            checked={form.passwordRequireUppercase}
            onChange={(next) => setForm((f) => ({ ...f, passwordRequireUppercase: next }))}
            aria-label="Require uppercase in password"
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-sm border border-slate-100 px-3 py-2">
          <span className="text-xs font-medium text-slate-700">Require number</span>
          <Switch
            checked={form.passwordRequireNumber}
            onChange={(next) => setForm((f) => ({ ...f, passwordRequireNumber: next }))}
            aria-label="Require number in password"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={setLbl}>IP whitelist (CIDR or IPs, comma-separated, empty = off)</label>
          <textarea
            className={`${setInp} min-h-[3.5rem]`}
            value={form.ipWhitelist}
            onChange={(e) => setForm((f) => ({ ...f, ipWhitelist: e.target.value }))}
            placeholder="203.0.113.0/24"
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button" className={adminBtnPrimary}>
          Save security settings (demo)
        </button>
      </div>
    </ResourcePanel>
  );
}
