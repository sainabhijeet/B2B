import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useIntegrations } from '@/components/integrations/IntegrationsContext';
import type { EmailProviderRow, IntegrationStatus } from '@/lib/integrationsDemoData';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

const PROVIDERS = ['SMTP', 'SendGrid', 'Amazon SES', 'Mailgun'];

export function EmailProvidersPage() {
  const { emailProviders, setEmailProviders } = useIntegrations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmailProviderRow | null>(null);
  const [provider, setProvider] = useState(PROVIDERS[0]!);
  const [smtpHost, setSmtpHost] = useState('');
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');

  function openAdd() {
    setEditing(null);
    setProvider(PROVIDERS[0]!);
    setSmtpHost('smtp.gmail.com');
    setPort(587);
    setUsername('');
    setPassword('');
    setFromEmail('');
    setFromName('');
    setOpen(true);
  }

  function openEdit(row: EmailProviderRow) {
    setEditing(row);
    setProvider(row.provider);
    setSmtpHost(row.smtpHost);
    setPort(row.port);
    setUsername(row.username);
    setPassword('');
    setFromEmail(row.fromEmail);
    setFromName(row.fromName);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const passMask = password.trim()
      ? `••••••••${password.trim().slice(-2)}`
      : editing?.passwordMasked ?? '••••••••';
    if (!editing) {
      setEmailProviders((list) => [
        ...list,
        {
          id: `em-${Date.now()}`,
          provider,
          smtpHost: smtpHost.trim() || 'smtp.example.com',
          port: Number(port) || 587,
          username: username.trim(),
          passwordMasked: passMask,
          fromEmail: fromEmail.trim() || 'noreply@example.com',
          fromName: fromName.trim() || 'Platform',
          status: 'inactive',
        },
      ]);
    } else {
      setEmailProviders((list) =>
        list.map((r) =>
          r.id === editing.id
            ? {
                ...r,
                provider,
                smtpHost: smtpHost.trim(),
                port: Number(port) || 587,
                username: username.trim(),
                passwordMasked: password.trim() ? passMask : r.passwordMasked,
                fromEmail: fromEmail.trim(),
                fromName: fromName.trim(),
              }
            : r,
        ),
      );
    }
    close();
  }

  function toggle(row: EmailProviderRow) {
    const next: IntegrationStatus = row.status === 'active' ? 'inactive' : 'active';
    setEmailProviders((list) =>
      list.map((r) => (r.id === row.id ? { ...r, status: next } : r)),
    );
  }

  return (
    <ResourcePanel
      title="Email providers"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd}>
          Add provider
        </button>
      }
    >
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={close}>
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <form onSubmit={onSubmit}>
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                {editing ? 'Edit email provider' : 'Add email provider'}
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
                  <label className={setLbl}>SMTP host</label>
                  <input className={setInp} value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
                </div>
                <div>
                  <label className={setLbl}>Port</label>
                  <input
                    className={setInp}
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={setLbl}>Username</label>
                  <input className={setInp} value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div>
                  <label className={setLbl}>Password</label>
                  <input
                    className={setInp}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editing ? 'Leave blank to keep' : ''}
                  />
                </div>
                <div>
                  <label className={setLbl}>From email</label>
                  <input
                    type="email"
                    className={setInp}
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className={setLbl}>From name</label>
                  <input className={setInp} value={fromName} onChange={(e) => setFromName(e.target.value)} />
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
          { id: 'p', header: 'Provider', cell: (r: EmailProviderRow) => r.provider },
          { id: 'h', header: 'SMTP host', cell: (r: EmailProviderRow) => r.smtpHost },
          { id: 'port', header: 'Port', cell: (r: EmailProviderRow) => String(r.port) },
          { id: 'u', header: 'Username', cell: (r: EmailProviderRow) => r.username },
          { id: 'fe', header: 'From', cell: (r: EmailProviderRow) => `${r.fromName} <${r.fromEmail}>` },
          {
            id: 'st',
            header: 'Status',
            cell: (r: EmailProviderRow) => (
              <span className={r.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}>
                {r.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            id: 'a',
            header: 'Actions',
            cell: (r: EmailProviderRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={adminBtnSecondary}
                  onClick={() => window.alert(`Test email queued via ${r.provider}`)}
                >
                  Send test
                </button>
                <button type="button" className={adminBtnSecondary} onClick={() => toggle(r)}>
                  {r.status === 'active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            ),
          },
        ]}
        rows={emailProviders}
        rowKey={(r) => r.id}
      />
    </ResourcePanel>
  );
}
