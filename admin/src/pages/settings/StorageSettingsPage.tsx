import { useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { storageDefaults } from '@/lib/systemSettingsDefaults';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function StorageSettingsPage() {
  const [form, setForm] = useState(storageDefaults);

  return (
    <ResourcePanel title="Storage settings">
      <div className="grid gap-3 p-3 sm:grid-cols-2">
        <div>
          <label className={setLbl}>Storage provider</label>
          <select
            className={setInp}
            value={form.storageProvider}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                storageProvider: e.target.value as typeof f.storageProvider,
              }))
            }
          >
            <option value="s3">AWS S3</option>
            <option value="r2">Cloudflare R2</option>
            <option value="local">Local storage</option>
          </select>
        </div>
        <div>
          <label className={setLbl}>Bucket name</label>
          <input
            className={setInp}
            value={form.bucketName}
            onChange={(e) => setForm((f) => ({ ...f, bucketName: e.target.value }))}
          />
        </div>
        <div>
          <label className={setLbl}>Max file upload size (MB)</label>
          <input
            type="number"
            min={1}
            className={setInp}
            value={form.maxFileUploadMb}
            onChange={(e) =>
              setForm((f) => ({ ...f, maxFileUploadMb: Number(e.target.value) || 1 }))
            }
          />
        </div>
        <div className="sm:col-span-2">
          <label className={setLbl}>Allowed file types (comma-separated)</label>
          <input
            className={setInp}
            value={form.allowedFileTypes}
            onChange={(e) => setForm((f) => ({ ...f, allowedFileTypes: e.target.value }))}
          />
        </div>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button" className={adminBtnPrimary}>
          Save storage settings (demo)
        </button>
      </div>
    </ResourcePanel>
  );
}
