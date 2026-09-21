import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { useMediaManager } from '@/components/media/MediaManagerContext';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

const ACCESS_ROWS = [
  { module: 'Product images', policy: 'Public', note: 'CDN cache, long TTL' },
  { module: 'Category images', policy: 'Public', note: 'Same as catalog' },
  { module: 'Ad banners', policy: 'Public', note: 'Signed optional for A/B' },
  { module: 'Tenant logos', policy: 'Public', note: 'Per-tenant path' },
  { module: 'Documents / PDFs', policy: 'Private', note: 'Signed URL or auth gate' },
  { module: 'Theme bundles', policy: 'Private', note: 'Builder-only access' },
];

export function MediaStoragePage() {
  const { storageTotalGb, storageUsedGb, fileCountApprox, growthSeries, security, setSecurity, files } =
    useMediaManager();

  const remaining = Math.max(0, storageTotalGb - storageUsedGb);
  const maxVal = Math.max(1, ...growthSeries.map((g) => g.usedGb));

  return (
    <div className="space-y-4">
      <ResourcePanel title="Storage usage">
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Total storage</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{storageTotalGb} GB</div>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Used</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{storageUsedGb} GB</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-600"
                style={{ width: `${Math.min(100, (storageUsedGb / storageTotalGb) * 100)}%` }}
              />
            </div>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Remaining</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{remaining.toFixed(1)} GB</div>
          </div>
          <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase text-slate-500">Files (platform)</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{fileCountApprox.toLocaleString()}</div>
            <div className="mt-1 text-[10px] text-slate-500">Library rows: {files.length}</div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase text-slate-500">Storage growth</div>
          <div className="mt-3 flex h-36 items-end gap-2">
            {growthSeries.map((g) => (
              <div key={g.label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-[3rem] rounded-t-sm bg-indigo-500/90 transition-all"
                  style={{ height: `${(g.usedGb / maxVal) * 100}%`, minHeight: '4px' }}
                  title={`${g.label}: ${g.usedGb} GB`}
                />
                <span className="text-[9px] text-slate-600">{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      </ResourcePanel>

      <ResourcePanel title="File security">
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          <div>
            <label className={setLbl}>Max file upload size (MB)</label>
            <input
              type="number"
              className={setInp}
              value={security.maxUploadMb}
              onChange={(e) => setSecurity((s) => ({ ...s, maxUploadMb: Number(e.target.value) || 1 }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={setLbl}>Allowed file types</label>
            <input
              className={setInp}
              value={security.allowedExtensions}
              onChange={(e) => setSecurity((s) => ({ ...s, allowedExtensions: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="vs"
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300"
              checked={security.virusScanEnabled}
              onChange={(e) => setSecurity((s) => ({ ...s, virusScanEnabled: e.target.checked }))}
            />
            <label htmlFor="vs" className="text-xs text-slate-800">
              Virus scan on upload (ClamAV / cloud AV)
            </label>
          </div>
        </div>
        <div className="border-t border-slate-100 px-3 py-2">
          <button type="button" className={adminBtnPrimary} onClick={() => window.alert('Security settings saved.')}>
            Save security settings
          </button>
        </div>
      </ResourcePanel>

      <ResourcePanel title="File access control">
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
          Public assets are readable without auth. Private requires auth or signed URLs with expiry.
        </p>
        <DataTable
          columns={[
            { id: 'm', header: 'Use case', cell: (r: (typeof ACCESS_ROWS)[0]) => r.module },
            {
              id: 'p',
              header: 'Default',
              cell: (r: (typeof ACCESS_ROWS)[0]) => (
                <span className={r.policy === 'Public' ? 'text-emerald-700' : 'text-amber-800'}>{r.policy}</span>
              ),
            },
            { id: 'n', header: 'Notes', cell: (r: (typeof ACCESS_ROWS)[0]) => r.note },
          ]}
          rows={ACCESS_ROWS}
          rowKey={(r) => r.module}
        />
      </ResourcePanel>
    </div>
  );
}
