import { useNavigate } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnDanger, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useBackup } from '@/components/backup/BackupContext';
import { formatBackupSize, TYPE_LABELS, type BackupRow } from '@/lib/backupDemoData';

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function BackupHistoryPage() {
  const navigate = useNavigate();
  const { backups, deleteBackup } = useBackup();
  const sorted = [...backups].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <ResourcePanel title="Backup history">
      <DataTable
        columns={[
          {
            id: 'id',
            header: 'Backup ID',
            cell: (r: BackupRow) => <span className="font-mono text-xs">{r.backupId}</span>,
          },
          { id: 't', header: 'Type', cell: (r: BackupRow) => TYPE_LABELS[r.type] },
          { id: 's', header: 'Size', cell: (r: BackupRow) => formatBackupSize(r.sizeBytes) },
          {
            id: 'st',
            header: 'Status',
            cell: (r: BackupRow) => (
              <span className={r.status === 'completed' ? 'text-emerald-700' : 'text-amber-800'}>
                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
              </span>
            ),
          },
          { id: 'c', header: 'Created at', cell: (r: BackupRow) => fmt(r.createdAt) },
          {
            id: 'a',
            header: 'Actions',
            cell: (r: BackupRow) => (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className={adminBtnSecondary}
                  onClick={() => window.alert(`Signed download URL for ${r.backupId} (demo).`)}
                >
                  Download
                </button>
                <button
                  type="button"
                  className={adminBtnSecondary}
                  onClick={() => navigate(`/backup/restore?backup=${encodeURIComponent(r.backupId)}`)}
                >
                  Restore
                </button>
                <button
                  type="button"
                  className={adminBtnDanger}
                  onClick={() => {
                    if (window.confirm(`Delete ${r.backupId}? This cannot be undone.`)) deleteBackup(r.backupId);
                  }}
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        rows={sorted}
        rowKey={(r) => r.backupId}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        <span className="font-mono">backups</span> row stores path, size, checksum. Apply lifecycle rules per retention.
      </p>
    </ResourcePanel>
  );
}
