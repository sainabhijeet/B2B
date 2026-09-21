import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useIntegrations } from '@/components/integrations/IntegrationsContext';
import { ApiError, apiPut } from '@/lib/apiClient';
import type { IntegrationStatus, PushProviderRow } from '@/lib/integrationsDemoData';
import { PLATFORM_FCM_PUSH_ID } from '@/lib/integrationsDemoData';
import type { FirebaseAdminPutBody } from '@/lib/platformSettingsApi';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

const PROVIDERS = ['Firebase Cloud Messaging', 'OneSignal'];

export function PushProvidersPage() {
  const {
    pushProviders,
    setPushProviders,
    reloadPushProviders,
    pushProvidersError,
  } = useIntegrations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PushProviderRow | null>(null);
  const [provider, setProvider] = useState(PROVIDERS[0]!);
  const [projectId, setProjectId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [serverKey, setServerKey] = useState('');
  const [appId, setAppId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hasFcmRow = pushProviders.some((p) => p.id === PLATFORM_FCM_PUSH_ID);

  function openAdd() {
    setEditing(null);
    setFormError(null);
    setProvider(hasFcmRow ? 'OneSignal' : PROVIDERS[0]!);
    setProjectId('');
    setClientEmail('');
    setPrivateKey('');
    setServerKey('');
    setAppId('');
    setOpen(true);
  }

  function openEdit(row: PushProviderRow) {
    setEditing(row);
    setFormError(null);
    setProvider(row.provider);
    setProjectId(row.projectId);
    setClientEmail(row.clientEmail ?? '');
    setPrivateKey('');
    setServerKey('');
    setAppId(row.appId === '—' ? '' : row.appId);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
    setFormError(null);
  }

  const isFirebaseForm = provider === 'Firebase Cloud Messaging' || Boolean(editing?.firebaseFromApi);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (isFirebaseForm) {
      setSaving(true);
      try {
        const body: FirebaseAdminPutBody = {
          projectId: projectId.trim(),
          clientEmail: clientEmail.trim(),
          privateKey: privateKey.trim() || undefined,
          status: editing?.status ?? 'active',
        };
        await apiPut('/admin/platform-settings/firebase-admin', body);
        await reloadPushProviders();
        close();
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : 'Save failed');
      } finally {
        setSaving(false);
      }
      return;
    }

    const masked = serverKey.trim()
      ? `••••••••${serverKey.trim().slice(-4)}`
      : editing?.serverKeyMasked ?? '••••••••';
    if (!editing) {
      setPushProviders((list) => [
        ...list,
        {
          id: `push-${Date.now()}`,
          provider,
          projectId: projectId.trim() || '—',
          serverKeyMasked: masked,
          appId: appId.trim() || '—',
          status: 'inactive',
        },
      ]);
    } else {
      setPushProviders((list) =>
        list.map((r) =>
          r.id === editing.id
            ? {
                ...r,
                provider,
                projectId: projectId.trim(),
                serverKeyMasked: serverKey.trim() ? masked : r.serverKeyMasked,
                appId: appId.trim(),
              }
            : r,
        ),
      );
    }
    close();
  }

  async function toggle(row: PushProviderRow) {
    if (row.firebaseFromApi) {
      const next: IntegrationStatus = row.status === 'active' ? 'inactive' : 'active';
      try {
        const body: FirebaseAdminPutBody = {
          projectId: row.projectId.trim(),
          clientEmail: (row.clientEmail ?? '').trim(),
          privateKey: undefined,
          status: next,
        };
        await apiPut('/admin/platform-settings/firebase-admin', body);
        await reloadPushProviders();
      } catch (err) {
        window.alert(err instanceof ApiError ? err.message : 'Update failed');
      }
      return;
    }
    const next: IntegrationStatus = row.status === 'active' ? 'inactive' : 'active';
    setPushProviders((list) => list.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
  }

  return (
    <ResourcePanel
      title="Push notification providers"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd}>
          Add provider
        </button>
      }
    >
      {pushProvidersError ? (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          {pushProvidersError}{' '}
          <button
            type="button"
            className="font-medium text-indigo-700 underline"
            onClick={() => void reloadPushProviders()}
          >
            Retry
          </button>
        </p>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={close}>
          <div
            className="w-full max-w-md rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <form onSubmit={(e) => void onSubmit(e)}>
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Push provider</div>
              <div className="grid gap-3 p-4">
                {formError ? (
                  <p className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] text-red-900">
                    {formError}
                  </p>
                ) : null}
                <div>
                  <label className={setLbl}>Provider</label>
                  <select
                    className={setInp}
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    disabled={Boolean(editing?.firebaseFromApi)}
                  >
                    {PROVIDERS.filter((p) => {
                      if (editing?.firebaseFromApi) return p === 'Firebase Cloud Messaging';
                      if (hasFcmRow && p === 'Firebase Cloud Messaging') return false;
                      return true;
                    }).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={setLbl}>Project ID</label>
                  <input className={setInp} value={projectId} onChange={(e) => setProjectId(e.target.value)} />
                </div>
                {isFirebaseForm ? (
                  <>
                    <div>
                      <label className={setLbl}>Service account email</label>
                      <input
                        className={setInp}
                        type="email"
                        autoComplete="off"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="firebase-adminsdk-…@….iam.gserviceaccount.com"
                      />
                    </div>
                    <div>
                      <label className={setLbl}>Private key (PEM)</label>
                      <textarea
                        className={`${setInp} min-h-[100px] font-mono text-[11px]`}
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        placeholder={editing?.firebaseFromApi ? 'Leave blank to keep existing key' : ''}
                        spellCheck={false}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Same service account is used for FCM (push) and verifying customer Firebase ID tokens. Stored
                      in <span className="font-mono">platform_firebase_admin</span>.
                    </p>
                  </>
                ) : (
                  <>
                    <div>
                      <label className={setLbl}>Server key / REST key</label>
                      <input
                        className={setInp}
                        type="password"
                        value={serverKey}
                        onChange={(e) => setServerKey(e.target.value)}
                        placeholder={editing ? 'Leave blank to keep' : ''}
                      />
                    </div>
                    <div>
                      <label className={setLbl}>App ID</label>
                      <input className={setInp} value={appId} onChange={(e) => setAppId(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={close}>
                  Cancel
                </button>
                <button type="submit" className={adminBtnPrimary} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={[
          { id: 'p', header: 'Provider', cell: (r: PushProviderRow) => r.provider },
          {
            id: 'pid',
            header: 'Project ID',
            cell: (r: PushProviderRow) => (r.projectId.trim() ? r.projectId : '—'),
          },
          {
            id: 'acc',
            header: 'Account / key',
            cell: (r: PushProviderRow) =>
              r.firebaseFromApi ? (r.clientEmail || '—') : r.serverKeyMasked,
          },
          {
            id: 'app',
            header: 'App / extra',
            cell: (r: PushProviderRow) => (r.firebaseFromApi ? r.serverKeyMasked : r.appId),
          },
          {
            id: 'st',
            header: 'Status',
            cell: (r: PushProviderRow) => (
              <span className={r.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}>
                {r.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            id: 'a',
            header: 'Actions',
            cell: (r: PushProviderRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={adminBtnSecondary}
                  onClick={() =>
                    r.firebaseFromApi
                      ? window.alert('Use your notification pipeline to send a test; FCM uses DB credentials.')
                      : window.alert(`Test push sent via ${r.provider} (demo).`)
                  }
                >
                  Test push
                </button>
                <button type="button" className={adminBtnSecondary} onClick={() => void toggle(r)}>
                  {r.status === 'active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            ),
          },
        ]}
        rows={pushProviders}
        rowKey={(r) => r.id}
      />
    </ResourcePanel>
  );
}
