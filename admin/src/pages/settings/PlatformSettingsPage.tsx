import { useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { platformDefaults } from '@/lib/systemSettingsDefaults';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function PlatformSettingsPage() {
  const [form, setForm] = useState(platformDefaults);

  return (
    <ResourcePanel title="Platform settings">
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <div>
          <label className={setLbl}>Platform name</label>
          <input
            className={setInp}
            value={form.platformName}
            onChange={(e) => setForm((f) => ({ ...f, platformName: e.target.value }))}
          />
        </div>
        <div>
          <label className={setLbl}>Platform URL</label>
          <input
            className={setInp}
            value={form.platformUrl}
            onChange={(e) => setForm((f) => ({ ...f, platformUrl: e.target.value }))}
          />
        </div>
        <div>
          <label className={setLbl}>Support email</label>
          <input
            type="email"
            className={setInp}
            value={form.supportEmail}
            onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
          />
        </div>
        <div>
          <label className={setLbl}>Support phone</label>
          <input
            className={setInp}
            value={form.supportPhone}
            onChange={(e) => setForm((f) => ({ ...f, supportPhone: e.target.value }))}
          />
        </div>
        <div>
          <label className={setLbl}>Default language</label>
          <select
            className={setInp}
            value={form.defaultLanguage}
            onChange={(e) => setForm((f) => ({ ...f, defaultLanguage: e.target.value }))}
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </div>
        <div>
          <label className={setLbl}>Default currency</label>
          <select
            className={setInp}
            value={form.defaultCurrency}
            onChange={(e) => setForm((f) => ({ ...f, defaultCurrency: e.target.value }))}
          >
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="AED">AED</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={setLbl}>Timezone</label>
          <input
            className={setInp}
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            placeholder="Asia/Kolkata"
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button" className={adminBtnPrimary}>
          Save platform settings (demo)
        </button>
      </div>
    </ResourcePanel>
  );
}
