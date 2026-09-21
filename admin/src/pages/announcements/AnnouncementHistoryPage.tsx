import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useAnnouncements } from '@/components/announcements/AnnouncementsContext';
import { useMemo } from 'react';
import type { AnnouncementHistoryRow } from '@/lib/announcementsDemoData';
import { AUDIENCE_LABELS } from '@/lib/announcementsDemoData';

export function AnnouncementHistoryPage() {
  const { history, announcements } = useAnnouncements();

  /** Past + archived rows: seed history + deleted archived; include ended active by date for demo */
  const syntheticEnded = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return announcements
      .filter((a) => a.endDate < today && a.status === 'active')
      .map(
        (a): AnnouncementHistoryRow => ({
          id: `syn-${a.announcementId}`,
          title: a.title,
          audienceLabel: AUDIENCE_LABELS[a.audience],
          createdAt: a.startDate,
          status: 'Ended',
        }),
      );
  }, [announcements]);

  const rows = useMemo(() => [...history, ...syntheticEnded], [history, syntheticEnded]);

  return (
    <ResourcePanel title="Announcement history">
      <DataTable
        columns={[
          { id: 't', header: 'Title', cell: (r: AnnouncementHistoryRow) => r.title },
          { id: 'a', header: 'Audience', cell: (r: AnnouncementHistoryRow) => r.audienceLabel },
          { id: 'd', header: 'Date', cell: (r: AnnouncementHistoryRow) => r.createdAt },
          { id: 's', header: 'Status', cell: (r: AnnouncementHistoryRow) => r.status },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Deleted items are appended here; long-term retention in <span className="font-mono">announcements</span> archive
        table.
      </p>
    </ResourcePanel>
  );
}
