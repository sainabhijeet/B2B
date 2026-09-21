import { useMemo, useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useMediaManager } from '@/components/media/MediaManagerContext';
import type { MediaFolderRow } from '@/lib/mediaModels';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

function buildPath(folders: MediaFolderRow[], folderId: string): string {
  const parts: string[] = [];
  let cur: string | null = folderId;
  while (cur) {
    const f = folders.find((x) => x.folderId === cur);
    if (!f) break;
    parts.unshift(f.folderName);
    cur = f.parentId;
  }
  return '/' + parts.join('/');
}

export function MediaFoldersPage() {
  const { folders, setFolders, files } = useMediaManager();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('root');

  const rows = useMemo(() => {
    return [...folders]
      .filter((f) => f.folderId !== 'root')
      .map((f) => ({
        ...f,
        path: buildPath(folders, f.folderId),
        fileCount: files.filter((x) => x.folderId === f.folderId).length,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [folders, files]);

  function onCreate(e: FormEvent) {
    e.preventDefault();
    const n = name.trim().replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
    if (!n) return;
    if (folders.some((f) => f.folderName === n && f.parentId === parentId)) {
      window.alert('Folder name already exists under this parent.');
      return;
    }
    setFolders((list) => [
      ...list,
      {
        folderId: `fld-${Date.now()}`,
        folderName: n,
        parentId: parentId || 'root',
        module: 'media',
        fileCount: 0,
      },
    ]);
    setName('');
    setOpen(false);
  }

  return (
    <ResourcePanel
      title="Folders"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={() => setOpen(true)}>
          New folder
        </button>
      }
    >
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <form onSubmit={onCreate}>
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Create folder</div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl}>Parent</label>
                  <select className={setInp} value={parentId} onChange={(e) => setParentId(e.target.value)}>
                    <option value="root">/media</option>
                    {folders
                      .filter((f) => f.folderId !== 'root')
                      .map((f) => (
                        <option key={f.folderId} value={f.folderId}>
                          {buildPath(folders, f.folderId)}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className={setLbl}>Folder name</label>
                  <input className={setInp} value={name} onChange={(e) => setName(e.target.value)} placeholder="ad-campaigns" required />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={adminBtnPrimary}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
        Example tree: <span className="font-mono">/media</span> → tenants, products, categories, ads, themes, documents.
      </p>
      <DataTable
        columns={[
          { id: 'p', header: 'Path', cell: (r: (typeof rows)[0]) => <span className="font-mono text-xs">{r.path}</span> },
          { id: 'n', header: 'Name', cell: (r: (typeof rows)[0]) => r.folderName },
          {
            id: 'c',
            header: 'Files',
            cell: (r: (typeof rows)[0]) => String(r.fileCount),
          },
        ]}
        rows={rows}
        rowKey={(r) => r.folderId}
      />
    </ResourcePanel>
  );
}
