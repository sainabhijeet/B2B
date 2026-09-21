import { useMemo } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useNotificationTemplates } from '@/components/notifications/NotificationTemplatesContext';
import {
  CHANNEL_LABELS,
  NOTIFICATION_EVENTS,
  type NotificationChannel,
} from '@/lib/notificationTemplateModels';

const CHANNEL_META: { id: NotificationChannel; notes: string; available: boolean }[] = [
  { id: 'sms', notes: 'Transactional SMS via provider; OTP and short alerts.', available: true },
  { id: 'email', notes: 'HTML/text email; order and subscription messaging.', available: true },
  { id: 'push', notes: 'Mobile / web push for status and build events.', available: true },
  { id: 'whatsapp', notes: 'Future: WhatsApp Business templates.', available: false },
];

export function NotificationChannelsPage() {
  const { templates } = useNotificationTemplates();

  const eventRows = useMemo(() => {
    return NOTIFICATION_EVENTS.map((ev) => {
      const related = templates.filter((t) => t.eventKey === ev.key);
      const channels = [...new Set(related.map((t) => CHANNEL_LABELS[t.channel]))].join(', ') || '—';
      const active = related.filter((t) => t.status === 'active').length;
      return {
        key: ev.key,
        label: ev.label,
        typical: CHANNEL_LABELS[ev.typicalChannel],
        channels,
        activeCount: active,
        total: related.length,
      };
    });
  }, [templates]);

  return (
    <div className="space-y-4">
      <ResourcePanel title="Supported channels">
        <DataTable
          columns={[
            { id: 'ch', header: 'Channel', cell: (r: (typeof CHANNEL_META)[0]) => CHANNEL_LABELS[r.id] },
            {
              id: 'av',
              header: 'Status',
              cell: (r: (typeof CHANNEL_META)[0]) => (r.available ? 'Available' : 'Planned'),
            },
            { id: 'notes', header: 'Notes', cell: (r: (typeof CHANNEL_META)[0]) => r.notes },
          ]}
          rows={CHANNEL_META}
          rowKey={(r) => r.id}
        />
      </ResourcePanel>

      <ResourcePanel title="Events → templates">
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
          Example routing: <span className="font-mono">user_login_otp</span> on login request typically uses SMS; order
          updates often use push. Your worker selects rows by <span className="font-mono">eventKey</span>, channel, and
          language.
        </p>
        <DataTable
          columns={[
            { id: 'ev', header: 'Event', cell: (r: (typeof eventRows)[0]) => r.label },
            { id: 'key', header: 'Event key', cell: (r: (typeof eventRows)[0]) => <span className="font-mono text-xs">{r.key}</span> },
            { id: 'typ', header: 'Typical channel', cell: (r: (typeof eventRows)[0]) => r.typical },
            { id: 'ch', header: 'Template channels', cell: (r: (typeof eventRows)[0]) => r.channels },
            {
              id: 'cnt',
              header: 'Active / total',
              cell: (r: (typeof eventRows)[0]) => `${r.activeCount} / ${r.total}`,
            },
          ]}
          rows={eventRows}
          rowKey={(r) => r.key}
        />
      </ResourcePanel>
    </div>
  );
}
