import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useIntegrations } from '@/components/integrations/IntegrationsContext';
import type { IntegrationStatus, PaymentGatewayRow } from '@/lib/integrationsDemoData';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

const GATEWAYS = ['Razorpay', 'Stripe', 'PayPal', 'Manual Payment'];

export function PaymentGatewaysPage() {
  const { paymentGateways, setPaymentGateways } = useIntegrations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentGatewayRow | null>(null);
  const [gateway, setGateway] = useState(GATEWAYS[0]!);
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  function openAdd() {
    setEditing(null);
    setGateway(GATEWAYS[0]!);
    setApiKey('');
    setSecret('');
    setWebhookUrl('https://api.platform.com/webhooks/');
    setOpen(true);
  }

  function openEdit(row: PaymentGatewayRow) {
    setEditing(row);
    setGateway(row.gateway);
    setApiKey('');
    setSecret('');
    setWebhookUrl(row.webhookUrl);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const k = apiKey.trim() ? `${apiKey.trim().slice(0, 8)}••••••••` : editing?.apiKeyMasked ?? '••••••••';
    const s = secret.trim() ? `••••••••${secret.trim().slice(-2)}` : editing?.secretMasked ?? '••••••••';
    if (!editing) {
      setPaymentGateways((list) => [
        ...list,
        {
          id: `pay-${Date.now()}`,
          gateway,
          apiKeyMasked: k,
          secretMasked: s,
          webhookUrl: webhookUrl.trim() || '—',
          status: 'inactive',
        },
      ]);
    } else {
      setPaymentGateways((list) =>
        list.map((r) =>
          r.id === editing.id
            ? {
                ...r,
                gateway,
                apiKeyMasked: apiKey.trim() ? k : r.apiKeyMasked,
                secretMasked: secret.trim() ? s : r.secretMasked,
                webhookUrl: webhookUrl.trim(),
              }
            : r,
        ),
      );
    }
    close();
  }

  function toggle(row: PaymentGatewayRow) {
    const next: IntegrationStatus = row.status === 'active' ? 'inactive' : 'active';
    setPaymentGateways((list) =>
      list.map((r) => (r.id === row.id ? { ...r, status: next } : r)),
    );
  }

  return (
    <ResourcePanel
      title="Payment gateways"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd}>
          Add gateway
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
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Payment gateway</div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl}>Gateway</label>
                  <select className={setInp} value={gateway} onChange={(e) => setGateway(e.target.value)}>
                    {GATEWAYS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={setLbl}>API key</label>
                  <input className={setInp} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                </div>
                <div>
                  <label className={setLbl}>Secret</label>
                  <input className={setInp} type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
                </div>
                <div>
                  <label className={setLbl}>Webhook URL</label>
                  <input className={setInp} value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
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
          { id: 'g', header: 'Gateway', cell: (r: PaymentGatewayRow) => r.gateway },
          { id: 'k', header: 'API key', cell: (r: PaymentGatewayRow) => r.apiKeyMasked },
          { id: 's', header: 'Secret', cell: (r: PaymentGatewayRow) => r.secretMasked },
          { id: 'w', header: 'Webhook', cell: (r: PaymentGatewayRow) => <span className="text-[11px] break-all">{r.webhookUrl}</span> },
          {
            id: 'st',
            header: 'Status',
            cell: (r: PaymentGatewayRow) => (
              <span
                className={
                  r.status === 'active'
                    ? 'text-emerald-700'
                    : r.status === 'error'
                      ? 'text-amber-800'
                      : 'text-slate-500'
                }
              >
                {r.status === 'active' ? 'Active' : r.status === 'error' ? 'Error' : 'Inactive'}
              </span>
            ),
          },
          {
            id: 'a',
            header: 'Actions',
            cell: (r: PaymentGatewayRow) => (
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
        rows={paymentGateways}
        rowKey={(r) => r.id}
      />
    </ResourcePanel>
  );
}
