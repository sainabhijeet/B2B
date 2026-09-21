import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useIntegrations } from '@/components/integrations/IntegrationsContext';
import type { IntegrationStatus, SmsProviderRow } from '@/lib/integrationsDemoData';
import { ApiError, apiGet, apiPut } from '@/lib/apiClient';
import type { SmsProvidersResponse } from '@/lib/platformSettingsApi';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

const PROVIDERS = ['MSG91'];

function rowsToPayload(
  rows: SmsProviderRow[],
): { id: string; provider: string; senderId: string; route: string; status: IntegrationStatus }[] {
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    senderId: r.senderId,
    route: r.route,
    status: r.status,
  }));
}

export function SmsProvidersPage() {
  const { smsProviders, setSmsProviders, smsProvidersHydrated, smsProvidersError, reloadSmsProviders } =
    useIntegrations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SmsProviderRow | null>(null);
  const [provider, setProvider] = useState(PROVIDERS[0]!);
  const [apiKey, setApiKey] = useState('');
  const [senderId, setSenderId] = useState('');
  const [route, setRoute] = useState('');
  const [saving, setSaving] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setProvider(PROVIDERS[0]!);
    setApiKey('');
    setSenderId('');
    setRoute('');
    setOpen(true);
  }

  function openEdit(row: SmsProviderRow) {
    setEditing(row);
    setProvider(row.provider);
    setApiKey('');
    setSenderId(row.senderId);
    setRoute(row.route);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
  }

  async function persistRows(nextList: SmsProviderRow[], apiKeyForId: string | null, apiKeyValue: string) {
    setPersistError(null);
    const payload = nextList.map((r) => ({
      id: r.id,
      provider: r.provider,
      senderId: r.senderId,
      route: r.route,
      status: r.status,
      apiKey:
        apiKeyForId && r.id === apiKeyForId && apiKeyValue.trim() ? apiKeyValue.trim() : undefined,
    }));
    await apiPut('/admin/platform-settings/sms-providers', { providers: payload });
    const d = await apiGet<SmsProvidersResponse>('/admin/platform-settings/sms-providers');
    const list = Array.isArray(d?.providers) ? d.providers : [];
    setSmsProviders(
      list.map((r) => ({
        id: r.id,
        provider: r.provider,
        apiKeyMasked: r.apiKeyMasked,
        senderId: r.senderId,
        route: r.route,
        status: r.status,
      })),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing && !apiKey.trim()) {
      window.alert('API key is required when adding a provider.');
      return;
    }
    if (!route.trim()) {
      window.alert('MSG91 OTP template ID is required.');
      return;
    }
    const newId = editing?.id ?? `sms-${Date.now()}`;
    const masked = apiKey.trim() ? `••••••••${apiKey.trim().slice(-4)}` : editing?.apiKeyMasked ?? '••••••••';

    let nextList: SmsProviderRow[];
    if (!editing) {
      nextList = [
        ...smsProviders,
        {
          id: newId,
          provider,
          apiKeyMasked: masked,
          senderId: senderId.trim() || 'SENDER',
          route: route.trim() || 'Primary',
          status: 'inactive',
        },
      ];
    } else {
      nextList = smsProviders.map((r) =>
        r.id === editing.id
          ? {
              ...r,
              provider,
              apiKeyMasked: apiKey.trim() ? masked : r.apiKeyMasked,
              senderId: senderId.trim(),
              route: route.trim(),
            }
          : r,
      );
    }

    setSaving(true);
    try {
      await persistRows(nextList, newId, apiKey);
      close();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Save failed';
      setPersistError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: SmsProviderRow) {
    const next: IntegrationStatus = row.status === 'active' ? 'inactive' : 'active';
    const nextList = smsProviders.map((r) => (r.id === row.id ? { ...r, status: next } : r));
    setSaving(true);
    setPersistError(null);
    try {
      await apiPut('/admin/platform-settings/sms-providers', { providers: rowsToPayload(nextList) });
      await reloadSmsProviders();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Update failed';
      setPersistError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResourcePanel
      title="SMS providers"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd} disabled={!smsProvidersHydrated || saving}>
          Add provider
        </button>
      }
    >
      {smsProvidersError ? (
        <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          {smsProvidersError}{' '}
          <button type="button" className="font-medium text-indigo-700 underline" onClick={() => void reloadSmsProviders()}>
            Retry
          </button>
        </p>
      ) : null}
      {persistError ? (
        <p className="border-b border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-900">{persistError}</p>
      ) : null}
      {!smsProvidersHydrated ? (
        <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">Loading from API…</p>
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
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                {editing ? 'Edit SMS provider' : 'Add SMS provider'}
              </div>
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
                  <label className={setLbl}>API key</label>
                  <input
                    className={setInp}
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={editing ? 'Leave blank to keep existing' : 'Required'}
                  />
                </div>
                <div>
                  <label className={setLbl}>Sender ID</label>
                  <input className={setInp} value={senderId} onChange={(e) => setSenderId(e.target.value)} />
                </div>
                <div>
                  <label className={setLbl}>OTP template ID</label>
                  <input className={setInp} value={route} onChange={(e) => setRoute(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={close} disabled={saving}>
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

      <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
        Stored in <span className="font-mono">system_config</span> key <span className="font-mono">platform_sms_providers</span>.
        Configure the MSG91 API auth key and approved OTP template ID. Production OTP requests fail closed when delivery is unavailable.
      </p>

      <DataTable
        columns={[
          { id: 'p', header: 'Provider', cell: (r: SmsProviderRow) => r.provider },
          { id: 'k', header: 'API key', cell: (r: SmsProviderRow) => r.apiKeyMasked },
          { id: 's', header: 'Sender ID', cell: (r: SmsProviderRow) => r.senderId },
          { id: 'r', header: 'OTP template ID', cell: (r: SmsProviderRow) => r.route },
          {
            id: 'st',
            header: 'Status',
            cell: (r: SmsProviderRow) => (
              <span className={r.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}>
                {r.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            id: 'a',
            header: 'Actions',
            cell: (r: SmsProviderRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)} disabled={saving}>
                  Edit
                </button>
                <button type="button" className={adminBtnSecondary} onClick={() => void toggle(r)} disabled={saving}>
                  {r.status === 'active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            ),
          },
        ]}
        rows={smsProviders}
        rowKey={(r) => r.id}
      />
    </ResourcePanel>
  );
}
