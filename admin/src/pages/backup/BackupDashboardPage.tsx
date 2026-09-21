import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { useBackup } from '@/components/backup/BackupContext';
import { formatBackupSize } from '@/lib/backupDemoData';

function StatCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-[10px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function BackupDashboardPage() {
  const { dashboard, settings } = useBackup();

  const last =
    dashboard.lastBackupAt != null
      ? new Date(dashboard.lastBackupAt).toLocaleString()
      : '—';

  return (
    <ResourcePanel title="Backup dashboard">
      <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Last backup" value={last} hint="Latest completed job" />
        <StatCard title="Backups stored" value={String(dashboard.totalBackups)} hint="In current catalog" />
        <StatCard
          title="Storage used"
          value={formatBackupSize(dashboard.storageUsedBytes)}
          hint="Sum of row sizes (demo)"
        />
        <StatCard title="Next scheduled" value={dashboard.nextScheduledLabel} hint={settings.retentionDays + ' day retention'} />
      </div>
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Best practice: daily DB backup, weekly full, 14-day retention on immutable object storage (S3 / R2).
      </p>
    </ResourcePanel>
  );
}
