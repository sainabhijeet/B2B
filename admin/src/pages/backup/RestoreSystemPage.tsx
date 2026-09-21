import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnDanger, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useBackup } from '@/components/backup/BackupContext';
import type { RestoreLogRow } from '@/lib/backupDemoData';

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function RestoreSystemPage() {
  const [searchParams] = useSearchParams();
  const { backups, recordRestore, restoreLogs } = useBackup();
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const q = searchParams.get('backup');
    if (q && backups.some((b) => b.backupId === q)) setSelectedId(q);
    else if (backups[0]) setSelectedId((prev) => prev || backups[0]!.backupId);
  }, [searchParams, backups]);

  const selected = backups.find((b) => b.backupId === selectedId);

  function onConfirmRestore() {
    if (!selectedId) return;
    if (
      !window.confirm(
        'Restoring this backup will overwrite current data on the target environment. Continue? (demo only)',
      )
    )
      return;
    if (
      !window.confirm(
        'Second confirmation: This action is destructive. I have a recent backup and am restoring in staging first.',
      )
    )
      return;
    recordRestore(selectedId, true, 'Full restore simulation; workers would drain and restart.');
    window.alert('Restore queued — in production, expect brief maintenance / rolling restart.');
  }

  return (
    <div className="space-y-4">
      <ResourcePanel title="Restore system">
        <div className="space-y-3 p-3">
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-500">Select backup</label>
            <select
              className="w-full max-w-md rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {backups.map((b) => (
                <option key={b.backupId} value={b.backupId}>
                  {b.backupId} — {b.type} — {b.createdAt.slice(0, 16)}
                </option>
              ))}
            </select>
          </div>
          {selected ? (
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700">
              <div>
                <span className="font-medium text-slate-800">Path:</span> {selected.filePath}
              </div>
              <div className="mt-1">
                <span className="font-medium text-slate-800">Includes:</span> {selected.includes}
              </div>
            </div>
          ) : null}
          <div className="rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Restoring a backup <strong>overwrites</strong> current database and/or files on the restore target. Run in
            staging first; verify checksums; plan maintenance window for production.
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={adminBtnDanger} onClick={onConfirmRestore} disabled={!selectedId}>
              Confirm restore
            </button>
            <button type="button" className={adminBtnSecondary} onClick={() => window.alert('Drain workers (demo).')}>
              System restart checklist
            </button>
          </div>
        </div>
      </ResourcePanel>

      <ResourcePanel title="Restore logs">
        <DataTable
          columns={[
            {
              id: 'id',
              header: 'Restore ID',
              cell: (r: RestoreLogRow) => <span className="font-mono text-[10px]">{r.restoreId}</span>,
            },
            { id: 'b', header: 'Backup ID', cell: (r: RestoreLogRow) => r.backupId },
            {
              id: 's',
              header: 'Status',
              cell: (r: RestoreLogRow) => (
                <span className={r.status === 'completed' ? 'text-emerald-700' : 'text-red-700'}>{r.status}</span>
              ),
            },
            { id: 't', header: 'Restored at', cell: (r: RestoreLogRow) => fmt(r.restoredAt) },
            { id: 'n', header: 'Note', cell: (r: RestoreLogRow) => r.note },
          ]}
          rows={restoreLogs}
          rowKey={(r) => r.restoreId}
        />
      </ResourcePanel>
    </div>
  );
}
