import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useIntegrations } from '@/components/integrations/IntegrationsContext';
import type { IntegrationStatus, StorageProviderRow } from '@/lib/integrationsDemoData';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

const PROVIDERS = ['AWS S3', 'Cloudflare R2', 'Google Cloud Storage', 'Local Storage'];

export function StorageProvidersPage() {
  const { storageProviders, setStorageProviders } = useIntegrations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StorageProviderRow | null>(null);
  const [provider, setProvider] = useState(PROVIDERS[0]!);
  const [bucket, setBucket] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secret, setSecret] = useState('');
  const [region, setRegion] = useState('');
  const [maxMb, setMaxMb] = useState(25);

  function openAdd() {
    setEditing(null);
    setProvider(PROVIDERS[0]!);
    setBucket('');
    setAccessKey('');
    setSecret('');
    setRegion('auto');
    setMaxMb(25);
    setOpen(true);
  }

  function openEdit(row: StorageProviderRow) {
    setEditing(row);
    setProvider(row.provider);
    setBucket(row.bucket);
    setAccessKey('');
    setSecret('');
    setRegion(row.region);
    setMaxMb(row.maxUploadMb);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const ak = accessKey.trim()
      ? `••••••••${accessKey.trim().slice(-4)}`
      : editing?.accessKeyMasked ?? '••••••••';
    const sk = secret.trim() ? `••••••••` : editing?.secretMasked ?? '••••••••';
    if (!editing) {
      setStorageProviders((list) => [
        ...list,
        {
          id: `st-${Date.now()}`,
          provider,
          bucket: bucket.trim() || 'bucket',
          accessKeyMasked: ak,
          secretMasked: sk,
          region: region.trim() || '—',
          maxUploadMb: Number(maxMb) || 25,
          status: 'inactive',
        },
      ]);
    } else {
      setStorageProviders((list) =>
        list.map((r) =>
          r.id === editing.id
            ? {
                ...r,
                provider,
                bucket: bucket.trim(),
                accessKeyMasked: accessKey.trim() ? ak : r.accessKeyMasked,
                secretMasked: secret.trim() ? sk : r.secretMasked,
                region: region.trim(),
                maxUploadMb: Number(maxMb) || 25,
              }
            : r,
        ),
      );
    }
    close();
  }

  function toggle(row: StorageProviderRow) {
    const next: IntegrationStatus = row.status === 'active' ? 'inactive' : 'active';
    setStorageProviders((list) =>
      list.map((r) => (r.id === row.id ? { ...r, status: next } : r)),
    );
  }

  return (
    <ResourcePanel
      title="Storage providers"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd}>
          Add storage
        </button>
      }
    >
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={close}>
          <div
            className="w-full max-w-md rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <form onSubmit={onSubmit}>
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Storage</div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl}>Provider</label>
                  <select className={setInp} value={provider} onChange={(e) => setProvider(e.target.value)}>
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={setLbl}>Bucket</label>
                  <input className={setInp} value={bucket} onChange={(e) => setBucket(e.target.value)} />
                </div>
                <div>
                  <label className={setLbl}>Access key</label>
                  <input className={setInp} type="password" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} />
                </div>
                <div>
                  <label className={setLbl}>Secret key</label>
                  <input className={setInp} type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
                </div>
                <div>
                  <label className={setLbl}>Region</label>
                  <input className={setInp} value={region} onChange={(e) => setRegion(e.target.value)} />
                </div>
                <div>
                  <label className={setLbl}>Max upload (MB)</label>
                  <input
                    type="number"
                    className={setInp}
                    value={maxMb}
                    onChange={(e) => setMaxMb(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={close}>
                  Cancel
                </button>
                <button type="submit" className={adminBtnPrimary}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={[
          { id: 'p', header: 'Provider', cell: (r: StorageProviderRow) => r.provider },
          { id: 'b', header: 'Bucket', cell: (r: StorageProviderRow) => r.bucket },
          { id: 'ak', header: 'Access key', cell: (r: StorageProviderRow) => r.accessKeyMasked },
          { id: 'rg', header: 'Region', cell: (r: StorageProviderRow) => r.region },
          { id: 'mx', header: 'Max MB', cell: (r: StorageProviderRow) => String(r.maxUploadMb) },
          {
            id: 'st',
            header: 'Status',
            cell: (r: StorageProviderRow) => (
              <span className={r.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}>
                {r.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            id: 'a',
            header: 'Actions',
            cell: (r: StorageProviderRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
                <button type="button" className={adminBtnSecondary} onClick={() => toggle(r)}>
                  {r.status === 'active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            ),
          },
        ]}
        rows={storageProviders}
        rowKey={(r) => r.id}
      />
    </ResourcePanel>
  );
}
