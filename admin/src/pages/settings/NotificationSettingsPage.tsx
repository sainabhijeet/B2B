import { useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { notificationDefaults } from '@/lib/systemSettingsDefaults';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function NotificationSettingsPage() {
  const [form, setForm] = useState(notificationDefaults);

  return (
    <ResourcePanel title="Notification settings">
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <div>
          <label className={setLbl}>Email provider</label>
          <select
            className={setInp}
            value={form.emailProvider}
            onChange={(e) => setForm((f) => ({ ...f, emailProvider: e.target.value }))}
          >
            <option value="smtp">SMTP</option>
            <option value="ses">Amazon SES</option>
            <option value="sendgrid">SendGrid</option>
          </select>
        </div>
        <div>
          <label className={setLbl}>SMS provider</label>
          <select
            className={setInp}
            value={form.smsProvider}
            onChange={(e) => setForm((f) => ({ ...f, smsProvider: e.target.value }))}
          >
            <option value="msg91">MSG91</option>
            <option value="twilio">Twilio</option>
            <option value="none">Disabled</option>
          </select>
        </div>
        <div>
          <label className={setLbl}>Push notification provider</label>
          <select
            className={setInp}
            value={form.pushProvider}
            onChange={(e) => setForm((f) => ({ ...f, pushProvider: e.target.value }))}
          >
            <option value="firebase">Firebase</option>
            <option value="apns">APNs only</option>
            <option value="none">Disabled</option>
          </select>
        </div>
        <div className="sm:col-span-2 border-t border-slate-100 pt-2">
          <div className="mb-2 text-[10px] font-semibold uppercase text-slate-500">SMTP</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={setLbl}>SMTP host</label>
              <input
                className={setInp}
                value={form.smtpHost}
                onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
              />
            </div>
            <div>
              <label className={setLbl}>SMTP port</label>
              <input
                type="number"
                className={setInp}
                value={form.smtpPort}
                onChange={(e) => setForm((f) => ({ ...f, smtpPort: Number(e.target.value) || 587 }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={setLbl}>SMTP user</label>
              <input
                className={setInp}
                value={form.smtpUser}
                onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))}
                placeholder="optional for SES IAM"
              />
            </div>
          </div>
        </div>
        <div>
          <label className={setLbl}>Free plan notification limit / day</label>
          <input
            type="number"
            min={0}
            className={setInp}
            value={form.freePlanNotificationLimit}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                freePlanNotificationLimit: Number(e.target.value) || 0,
              }))
            }
          />
        </div>
        <div>
          <label className={setLbl}>Paid plan notification limit / day</label>
          <input
            type="number"
            min={0}
            className={setInp}
            value={form.paidPlanNotificationLimit}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                paidPlanNotificationLimit: Number(e.target.value) || 0,
              }))
            }
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button" className={adminBtnPrimary}>
          Save notification settings (demo)
        </button>
      </div>
    </ResourcePanel>
  );
}
