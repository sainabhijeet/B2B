import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { useBackup } from '@/components/backup/BackupContext';
import { STORAGE_LABELS, type BackupSettings } from '@/lib/backupDemoData';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function BackupSettingsPage() {
  const { settings, setSettings } = useBackup();

  return (
    <div className="space-y-4">
      <ResourcePanel title="Automatic schedule">
        <div className="grid max-w-lg gap-3 p-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={setLbl}>Backup frequency</label>
            <select
              className={setInp}
              value={settings.frequency}
              onChange={(e) =>
                setSettings((s) => ({ ...s, frequency: e.target.value as BackupSettings['frequency'] }))
              }
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="manual">Manual only</option>
            </select>
          </div>
          <div>
            <label className={setLbl}>Run at (local time)</label>
            <input
              type="time"
              className={setInp}
              value={settings.scheduleTime}
              onChange={(e) => setSettings((s) => ({ ...s, scheduleTime: e.target.value }))}
              disabled={settings.frequency === 'manual'}
            />
            {settings.frequency === 'daily' ? (
              <p className="mt-1 text-[10px] text-slate-500">Example: daily at 02:00</p>
            ) : null}
          </div>
          <div>
            <label className={setLbl}>Retention (days)</label>
            <input
              type="number"
              min={1}
              className={setInp}
              value={settings.retentionDays}
              onChange={(e) =>
                setSettings((s) => ({ ...s, retentionDays: Number(e.target.value) || 1 }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className={setLbl}>Storage location</label>
            <select
              className={setInp}
              value={settings.storageLocation}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  storageLocation: e.target.value as BackupSettings['storageLocation'],
                }))
              }
            >
              {(Object.keys(STORAGE_LABELS) as BackupSettings['storageLocation'][]).map((k) => (
                <option key={k} value={k}>
                  {STORAGE_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="comp"
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300"
              checked={settings.compression}
              onChange={(e) => setSettings((s) => ({ ...s, compression: e.target.checked }))}
            />
            <label htmlFor="comp" className="text-xs text-slate-800">
              Compression (gzip / zstd)
            </label>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="enc"
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300"
              checked={settings.encryptionEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, encryptionEnabled: e.target.checked }))}
            />
            <label htmlFor="enc" className="text-xs text-slate-800">
              Backup encryption at rest (KMS-managed keys)
            </label>
          </div>
        </div>
        <div className="border-t border-slate-100 px-3 py-2">
          <button type="button" className={adminBtnPrimary} onClick={() => window.alert('Saved to session (demo).')}>
            Save settings
          </button>
        </div>
      </ResourcePanel>

      <ResourcePanel title="Security measures">
        <ul className="list-inside list-disc space-y-1 px-3 py-3 text-xs text-slate-700">
          <li>Encryption for archives and transport (TLS + SSE-KMS / customer-managed keys).</li>
          <li>Access control: only Super Admin + break-glass role can restore production.</li>
          <li>Download authentication: short-lived signed URLs; audit every fetch.</li>
        </ul>
      </ResourcePanel>
    </div>
  );
}
