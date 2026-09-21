import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { useBackup } from '@/components/backup/BackupContext';
import type { BackupType } from '@/lib/backupDemoData';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function ManualBackupPage() {
  const { createManualBackup } = useBackup();
  const [mode, setMode] = useState<'full' | 'database' | 'files'>('full');
  const [includeDb, setIncludeDb] = useState(true);
  const [includeMedia, setIncludeMedia] = useState(true);
  const [includeConfigs, setIncludeConfigs] = useState(true);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    let type: BackupType = 'full';
    const incDb = mode === 'full' ? includeDb : mode === 'database';
    const incMedia = mode === 'full' ? includeMedia : mode === 'files';
    const incCfg = mode === 'full' ? includeConfigs : mode === 'files';

    if (mode === 'database') type = 'database';
    else if (mode === 'files') type = 'files';
    else type = 'full';

    createManualBackup({
      type,
      includeDatabase: incDb,
      includeMedia: incMedia,
      includeConfigs: incCfg,
    });
    window.alert('Backup job completed (demo) — new row in history.');
  }

  return (
    <ResourcePanel title="Manual backup">
      <form className="max-w-lg space-y-4 p-3" onSubmit={onSubmit}>
        <div>
          <div className={setLbl}>Backup type</div>
          <select className={setInp} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="full">Full backup</option>
            <option value="database">Database only</option>
            <option value="files">Files / media</option>
          </select>
        </div>
        {mode === 'full' ? (
          <div className="space-y-2 rounded-sm border border-slate-200 bg-slate-50 p-3">
            <div className={setLbl}>Include</div>
            <label className="flex items-center gap-2 text-xs text-slate-800">
              <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" checked={includeDb} onChange={(e) => setIncludeDb(e.target.checked)} />
              Database
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-800">
              <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" checked={includeMedia} onChange={(e) => setIncludeMedia(e.target.checked)} />
              Media files
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-800">
              <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" checked={includeConfigs} onChange={(e) => setIncludeConfigs(e.target.checked)} />
              Configs
            </label>
          </div>
        ) : (
          <p className="text-[11px] text-slate-600">
            {mode === 'database'
              ? 'Logical dump of primary PostgreSQL cluster.'
              : 'Object storage snapshot for tenant uploads and CDN origins.'}
          </p>
        )}
        <button type="submit" className={adminBtnPrimary}>
          Create backup
        </button>
      </form>
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Workers should stream to encrypted archives; download links require signed URLs and RBAC.
      </p>
    </ResourcePanel>
  );
}
