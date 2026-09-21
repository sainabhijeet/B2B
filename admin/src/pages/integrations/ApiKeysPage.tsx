import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnDanger, adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useIntegrations } from '@/components/integrations/IntegrationsContext';
import type { ApiKeyRow, IntegrationStatus } from '@/lib/integrationsDemoData';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

const PERMS = ['Read only', 'Read / Write', 'Admin'];

export function ApiKeysPage() {
  const { apiKeys, setApiKeys } = useIntegrations();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState(PERMS[1]!);

  function openAdd() {
    setName('');
    setPermissions(PERMS[1]!);
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const suffix = Math.random().toString(36).slice(2, 6);
    setApiKeys((list) => [
      ...list,
      {
        id: `apk-${Date.now()}`,
        name: n,
        keyMasked: `sk_live_••••••••${suffix}`,
        permissions,
        status: 'active',
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ]);
    close();
  }

  function revoke(row: ApiKeyRow) {
    if (!window.confirm(`Revoke “${row.name}”? Clients using this key will fail.`)) return;
    setApiKeys((list) => list.filter((k) => k.id !== row.id));
  }

  function toggle(row: ApiKeyRow) {
    const next: IntegrationStatus = row.status === 'active' ? 'inactive' : 'active';
    setApiKeys((list) => list.map((k) => (k.id === row.id ? { ...k, status: next } : k)));
  }

  return (
    <ResourcePanel
      title="API keys"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd}>
          Create API key
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
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">New API key</div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl}>Key name</label>
                  <input className={setInp} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className={setLbl}>Permissions</label>
                  <select className={setInp} value={permissions} onChange={(e) => setPermissions(e.target.value)}>
                    {PERMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={close}>
                  Cancel
                </button>
                <button type="submit" className={adminBtnPrimary}>
                  Create (demo)
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={[
          { id: 'n', header: 'Name', cell: (r: ApiKeyRow) => r.name },
          { id: 'k', header: 'Key', cell: (r: ApiKeyRow) => <span className="font-mono text-xs">{r.keyMasked}</span> },
          { id: 'p', header: 'Permissions', cell: (r: ApiKeyRow) => r.permissions },
          {
            id: 'st',
            header: 'Status',
            cell: (r: ApiKeyRow) => (
              <span className={r.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}>
                {r.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          { id: 'c', header: 'Created', cell: (r: ApiKeyRow) => r.createdAt },
          {
            id: 'a',
            header: 'Actions',
            cell: (r: ApiKeyRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => toggle(r)}>
                  {r.status === 'active' ? 'Disable' : 'Enable'}
                </button>
                <button type="button" className={adminBtnDanger} onClick={() => revoke(r)}>
                  Revoke
                </button>
              </div>
            ),
          },
        ]}
        rows={apiKeys}
        rowKey={(r) => r.id}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Full secret is shown once at creation in production. Here only masked values are stored in session state.
      </p>
    </ResourcePanel>
  );
}
