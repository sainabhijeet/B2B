import { useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useNotificationTemplates } from '@/components/notifications/NotificationTemplatesContext';
import { CHANNEL_LABELS, type NotificationLogRow } from '@/lib/notificationTemplateModels';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function NotificationLogsPage() {
  const { logs } = useNotificationTemplates();
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...logs]
      .filter(
        (r) =>
          !t ||
          r.templateName.toLowerCase().includes(t) ||
          r.recipient.toLowerCase().includes(t) ||
          r.notificationId.toLowerCase().includes(t),
      )
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }, [logs, q]);

  return (
    <ResourcePanel title="Notification logs">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-3">
        <div className="min-w-[12rem] flex-1">
          <label className={setLbl} htmlFor="log-q">
            Search recipient, template, ID
          </label>
          <input
            id="log-q"
            className={setInp}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SMS, email, …"
          />
        </div>
      </div>
      <DataTable
        columns={[
          {
            id: 'id',
            header: 'Notification ID',
            cell: (r: NotificationLogRow) => <span className="font-mono text-[10px]">{r.notificationId}</span>,
          },
          { id: 'tpl', header: 'Template', cell: (r: NotificationLogRow) => r.templateName },
          {
            id: 'ch',
            header: 'Channel',
            cell: (r: NotificationLogRow) => CHANNEL_LABELS[r.channel],
          },
          { id: 'to', header: 'Recipient', cell: (r: NotificationLogRow) => r.recipient },
          { id: 'st', header: 'Status', cell: (r: NotificationLogRow) => r.status },
          { id: 'at', header: 'Timestamp', cell: (r: NotificationLogRow) => fmt(r.sentAt) },
        ]}
        rows={rows}
        rowKey={(r: NotificationLogRow) => r.notificationId}
      />
    </ResourcePanel>
  );
}
