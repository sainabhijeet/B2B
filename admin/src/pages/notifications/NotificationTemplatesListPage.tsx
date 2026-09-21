import { useMemo, useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useNotificationTemplates } from '@/components/notifications/NotificationTemplatesContext';
import {
  CHANNEL_LABELS,
  NOTIFICATION_EVENTS,
  renderEmailPreview,
  TEMPLATE_VARIABLES,
  type NotificationChannel,
  type NotificationTemplateRow,
  type TemplateStatus,
} from '@/lib/notificationTemplateModels';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

const LANG_OPTIONS = ['English', 'Hindi', 'French', 'Spanish', 'Arabic', 'German'];

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusStyle(s: TemplateStatus) {
  if (s === 'active') return 'text-emerald-700';
  if (s === 'draft') return 'text-amber-800';
  return 'text-slate-500';
}

function defaultVarsForTemplate(t: NotificationTemplateRow): Record<string, string> {
  const text = `${t.subject ?? ''} ${t.body}`;
  const keys = [...text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]!);
  const unique = [...new Set(keys)];
  const map: Record<string, string> = {};
  for (const k of unique) {
    const def = TEMPLATE_VARIABLES.find((v) => v.token === `{{${k}}}`);
    map[k] = def?.example ?? `sample_${k}`;
  }
  return map;
}

export function NotificationTemplatesListPage() {
  const { templates, setTemplates } = useNotificationTemplates();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationTemplateRow | null>(null);
  const [name, setName] = useState('');
  const [eventKey, setEventKey] = useState(NOTIFICATION_EVENTS[0]!.key);
  const [channel, setChannel] = useState<NotificationChannel>('sms');
  const [language, setLanguage] = useState('English');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<TemplateStatus>('active');

  const [previewRow, setPreviewRow] = useState<NotificationTemplateRow | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});

  const sorted = useMemo(
    () => [...templates].sort((a, b) => a.name.localeCompare(b.name)),
    [templates],
  );

  function openAdd() {
    setEditing(null);
    setName('');
    setEventKey(NOTIFICATION_EVENTS[0]!.key);
    setChannel('sms');
    setLanguage('English');
    setSubject('');
    setBody('Your OTP is {{otp}}. Expires in {{expiry}} minutes.');
    setStatus('draft');
    setEditorOpen(true);
  }

  function openEdit(row: NotificationTemplateRow) {
    setEditing(row);
    setName(row.name);
    setEventKey(row.eventKey);
    setChannel(row.channel);
    setLanguage(row.language);
    setSubject(row.subject ?? '');
    setBody(row.body);
    setStatus(row.status);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
  }

  function onSubmitEditor(e: FormEvent) {
    e.preventDefault();
    const ev = NOTIFICATION_EVENTS.find((x) => x.key === eventKey);
    const eventLabel = ev?.label ?? eventKey;
    const subj = channel === 'email' ? subject.trim() || null : null;
    const now = new Date().toISOString();

    if (!editing) {
      const row: NotificationTemplateRow = {
        templateId: `nt-${Date.now()}`,
        name: name.trim(),
        eventKey,
        eventLabel,
        channel,
        language: language.trim() || 'English',
        subject: subj,
        body,
        status,
        updatedAt: now,
      };
      setTemplates((list) => [...list, row]);
    } else {
      setTemplates((list) =>
        list.map((t) =>
          t.templateId === editing.templateId
            ? {
                ...t,
                name: name.trim(),
                eventKey,
                eventLabel,
                channel,
                language: language.trim() || 'English',
                subject: subj,
                body,
                status,
                updatedAt: now,
              }
            : t,
        ),
      );
    }
    closeEditor();
  }

  function setInactive(row: NotificationTemplateRow) {
    if (row.status === 'inactive') return;
    if (!window.confirm(`Deactivate “${row.name}”? Notifications for this template will not be sent.`)) return;
    setTemplates((list) =>
      list.map((t) =>
        t.templateId === row.templateId ? { ...t, status: 'inactive' as const, updatedAt: new Date().toISOString() } : t,
      ),
    );
  }

  function setActive(row: NotificationTemplateRow) {
    setTemplates((list) =>
      list.map((t) =>
        t.templateId === row.templateId ? { ...t, status: 'active' as const, updatedAt: new Date().toISOString() } : t,
      ),
    );
  }

  function openPreview(row: NotificationTemplateRow) {
    setPreviewRow(row);
    setPreviewVars(defaultVarsForTemplate(row));
  }

  function closePreview() {
    setPreviewRow(null);
  }

  return (
    <ResourcePanel
      title="Templates"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd}>
          New template
        </button>
      }
    >
      {editorOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeEditor}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tmpl-editor-title"
          >
            <form onSubmit={onSubmitEditor}>
              <div className="sticky top-0 border-b border-slate-100 bg-white px-4 py-3">
                <h2 id="tmpl-editor-title" className="text-sm font-semibold text-slate-900">
                  {editing ? 'Edit template' : 'New template'}
                </h2>
              </div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl}>Template name</label>
                  <input className={setInp} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className={setLbl}>Event type</label>
                  <select className={setInp} value={eventKey} onChange={(e) => setEventKey(e.target.value)} required>
                    {NOTIFICATION_EVENTS.map((ev) => (
                      <option key={ev.key} value={ev.key}>
                        {ev.label} ({ev.key})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Triggers (e.g. login) resolve this key to pick the right row for channel + language.
                  </p>
                </div>
                <div>
                  <label className={setLbl}>Channel</label>
                  <select
                    className={setInp}
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as NotificationChannel)}
                  >
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="push">Push</option>
                    <option value="whatsapp">WhatsApp (beta)</option>
                  </select>
                </div>
                <div>
                  <label className={setLbl}>Language</label>
                  <select className={setInp} value={language} onChange={(e) => setLanguage(e.target.value)}>
                    {LANG_OPTIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                {channel === 'email' ? (
                  <div>
                    <label className={setLbl}>Subject</label>
                    <input className={setInp} value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                ) : null}
                <div>
                  <label className={setLbl}>Message body</label>
                  <textarea
                    className={`${setInp} min-h-[8rem] font-mono text-[11px]`}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    spellCheck={false}
                  />
                </div>
                <div>
                  <label className={setLbl}>Status</label>
                  <select
                    className={setInp}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TemplateStatus)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={closeEditor}>
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

      {previewRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closePreview}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Preview — {previewRow.name}</h2>
              <p className="text-[10px] text-slate-500">
                {CHANNEL_LABELS[previewRow.channel]} · {previewRow.language}
              </p>
            </div>
            <div className="space-y-3 p-4">
              {Object.keys(previewVars).length ? (
                <div className="space-y-2">
                  <div className={setLbl}>Variables</div>
                  {Object.entries(previewVars).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="w-28 shrink-0 font-mono text-[10px] text-slate-600">{`{{${k}}}`}</span>
                      <input
                        className={setInp}
                        value={v}
                        onChange={(e) => setPreviewVars((m) => ({ ...m, [k]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="rounded-sm border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                {previewRow.channel === 'email' && previewRow.subject ? (
                  <p className="mb-2 font-medium">
                    Subject: {renderEmailPreview(previewRow.subject, previewRow.body, previewVars).subject}
                  </p>
                ) : null}
                <pre className="font-sans whitespace-pre-wrap">
                  {renderEmailPreview(previewRow.subject, previewRow.body, previewVars).body}
                </pre>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-4 py-3">
              <button type="button" className={adminBtnSecondary} onClick={closePreview}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={[
          { id: 'name', header: 'Template name', cell: (r: NotificationTemplateRow) => r.name },
          { id: 'ev', header: 'Event', cell: (r: NotificationTemplateRow) => r.eventLabel },
          {
            id: 'ch',
            header: 'Channel',
            cell: (r: NotificationTemplateRow) => CHANNEL_LABELS[r.channel],
          },
          { id: 'lang', header: 'Language', cell: (r: NotificationTemplateRow) => r.language },
          {
            id: 'st',
            header: 'Status',
            cell: (r: NotificationTemplateRow) => (
              <span className={statusStyle(r.status)}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
            ),
          },
          { id: 'up', header: 'Updated', cell: (r: NotificationTemplateRow) => fmtDate(r.updatedAt) },
          {
            id: 'act',
            header: 'Actions',
            cell: (r: NotificationTemplateRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
                <button type="button" className={adminBtnSecondary} onClick={() => openPreview(r)}>
                  Preview
                </button>
                {r.status !== 'inactive' ? (
                  <button type="button" className={adminBtnSecondary} onClick={() => setInactive(r)}>
                    Disable
                  </button>
                ) : (
                  <button type="button" className={adminBtnSecondary} onClick={() => setActive(r)}>
                    Enable
                  </button>
                )}
              </div>
            ),
          },
        ]}
        rows={sorted}
        rowKey={(r: NotificationTemplateRow) => r.templateId}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Inactive templates are skipped by dispatchers. Draft helps you prepare copy before go-live.
      </p>
    </ResourcePanel>
  );
}
