import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useIntegrations } from '@/components/integrations/IntegrationsContext';
import type { IntegrationStatus, WebhookRow } from '@/lib/integrationsDemoData';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

const EVENTS = [
  'order_created',
  'tenant_registered',
  'subscription_renewed',
  'build_completed',
  'payment_succeeded',
];

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function WebhooksPage() {
  const { webhooks, setWebhooks } = useIntegrations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookRow | null>(null);
  const [eventType, setEventType] = useState(EVENTS[0]!);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');

  function openAdd() {
    setEditing(null);
    setEventType(EVENTS[0]!);
    setUrl('https://');
    setSecret('');
    setOpen(true);
  }

  function openEdit(row: WebhookRow) {
    setEditing(row);
    setEventType(row.eventType);
    setUrl(row.url);
    setSecret('');
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const sec = secret.trim() ? `whsec_••••••••${secret.trim().slice(-2)}` : editing?.secretMasked ?? '••••••••';
    const now = new Date().toISOString();
    if (!editing) {
      setWebhooks((list) => [
        ...list,
        {
          webhookId: `wh-${Date.now()}`,
          eventType,
          url: url.trim(),
          secretMasked: sec,
          status: 'inactive',
          updatedAt: now,
        },
      ]);
    } else {
      setWebhooks((list) =>
        list.map((w) =>
          w.webhookId === editing.webhookId
            ? {
                ...w,
                eventType,
                url: url.trim(),
                secretMasked: secret.trim() ? sec : w.secretMasked,
                updatedAt: now,
              }
            : w,
        ),
      );
    }
    close();
  }

  function toggle(row: WebhookRow) {
    const next: IntegrationStatus = row.status === 'active' ? 'inactive' : 'active';
    setWebhooks((list) =>
      list.map((w) =>
        w.webhookId === row.webhookId ? { ...w, status: next, updatedAt: new Date().toISOString() } : w,
      ),
    );
  }

  return (
    <ResourcePanel
      title="Webhook integrations"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd}>
          Add webhook
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
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Webhook</div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl}>Event type</label>
                  <select className={setInp} value={eventType} onChange={(e) => setEventType(e.target.value)}>
                    {EVENTS.map((ev) => (
                      <option key={ev} value={ev}>
                        {ev}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={setLbl}>Webhook URL</label>
                  <input className={setInp} value={url} onChange={(e) => setUrl(e.target.value)} required />
                </div>
                <div>
                  <label className={setLbl}>Secret token</label>
                  <input
                    className={setInp}
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder={editing ? 'Leave blank to keep' : ''}
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
          {
            id: 'id',
            header: 'Webhook ID',
            cell: (r: WebhookRow) => <span className="font-mono text-[10px]">{r.webhookId}</span>,
          },
          {
            id: 'ev',
            header: 'Event',
            cell: (r: WebhookRow) => <span className="font-mono text-xs">{r.eventType}</span>,
          },
          { id: 'u', header: 'URL', cell: (r: WebhookRow) => <span className="break-all text-[11px]">{r.url}</span> },
          { id: 's', header: 'Secret', cell: (r: WebhookRow) => r.secretMasked },
          {
            id: 'st',
            header: 'Status',
            cell: (r: WebhookRow) => (
              <span className={r.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}>
                {r.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          { id: 'up', header: 'Updated', cell: (r: WebhookRow) => fmt(r.updatedAt) },
          {
            id: 'a',
            header: 'Actions',
            cell: (r: WebhookRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={adminBtnSecondary}
                  onClick={() => window.alert(`Replay sample payload for ${r.eventType} (demo).`)}
                >
                  Test
                </button>
                <button type="button" className={adminBtnSecondary} onClick={() => toggle(r)}>
                  {r.status === 'active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            ),
          },
        ]}
        rows={webhooks}
        rowKey={(r) => r.webhookId}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Maps to <span className="font-mono">webhooks</span> (event_type, url, secret, status). Sign outbound payloads
        with the shared secret.
      </p>
    </ResourcePanel>
  );
}
