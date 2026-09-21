import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Image as ImageIcon, LayoutGrid, List, Film, FileArchive, File } from 'lucide-react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useMediaManager } from '@/components/media/MediaManagerContext';
import {
  formatFileSize,
  publicUrlForPath,
  type MediaFileRow,
  type MediaFileType,
} from '@/lib/mediaModels';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

function typeIcon(t: MediaFileType) {
  const c = 'h-8 w-8 text-slate-400';
  switch (t) {
    case 'image':
      return <ImageIcon className={c} aria-hidden />;
    case 'video':
      return <Film className={c} aria-hidden />;
    case 'archive':
      return <FileArchive className={c} aria-hidden />;
    case 'document':
      return <FileText className={c} aria-hidden />;
    default:
      return <File className={c} aria-hidden />;
  }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function MediaLibraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { files, folders, deleteFile } = useMediaManager();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [moduleFilter, setModuleFilter] = useState<string>('');
  const [detail, setDetail] = useState<MediaFileRow | null>(null);

  const modules = useMemo(() => [...new Set(files.map((f) => f.module))].sort(), [files]);

  const filtered = useMemo(() => {
    return files.filter((f) => {
      if (typeFilter && f.fileType !== typeFilter) return false;
      if (moduleFilter && f.module !== moduleFilter) return false;
      return true;
    });
  }, [files, typeFilter, moduleFilter]);

  const folderName = (id: string) => folders.find((x) => x.folderId === id)?.folderName ?? id;
  const pickTarget = searchParams.get('pickTarget');
  const returnTo = searchParams.get('returnTo');
  const pickField = searchParams.get('pickField');
  const isThemePreviewPicker = pickTarget === 'theme-preview' && !!returnTo;

  function pickForTheme(row: MediaFileRow) {
    if (!isThemePreviewPicker || !returnTo || row.fileType !== 'image') return;
    const url = publicUrlForPath(row.filePath);
    const sep = returnTo.includes('?') ? '&' : '?';
    const next = `${returnTo}${sep}pickedMediaUrl=${encodeURIComponent(url)}${
      pickField ? `&pickedMediaField=${encodeURIComponent(pickField)}` : ''
    }`;
    navigate(next);
  }

  return (
    <ResourcePanel
      title="Media library"
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={view === 'grid' ? adminBtnPrimary : adminBtnSecondary}
            onClick={() => setView('grid')}
          >
            <span className="inline-flex items-center gap-1">
              <LayoutGrid className="h-3.5 w-3.5" /> Grid
            </span>
          </button>
          <button
            type="button"
            className={view === 'list' ? adminBtnPrimary : adminBtnSecondary}
            onClick={() => setView('list')}
          >
            <span className="inline-flex items-center gap-1">
              <List className="h-3.5 w-3.5" /> List
            </span>
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-3">
        <div>
          <label className={setLbl} htmlFor="mf-type">
            File type
          </label>
          <select id="mf-type" className={setInp} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="image">Image</option>
            <option value="document">Document</option>
            <option value="video">Video</option>
            <option value="archive">Archive</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={setLbl} htmlFor="mf-mod">
            Module
          </label>
          <select id="mf-mod" className={setInp} value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
            <option value="">All</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((f) => (
            <button
              key={f.fileId}
              type="button"
              onClick={() => setDetail(f)}
              className="flex flex-col rounded-sm border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300 hover:shadow"
            >
              <div className="mb-2 flex h-16 items-center justify-center rounded-sm bg-slate-50">{typeIcon(f.fileType)}</div>
              <div className="truncate text-xs font-medium text-slate-900">{f.fileName}</div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {f.fileType} · {formatFileSize(f.fileSizeBytes)} · {f.module}
              </div>
              <div className="mt-1 text-[10px] text-slate-400">{fmtDate(f.createdAt)}</div>
            </button>
          ))}
        </div>
      ) : (
        <DataTable
          columns={[
            { id: 'n', header: 'File name', cell: (r: MediaFileRow) => r.fileName },
            { id: 't', header: 'Type', cell: (r: MediaFileRow) => r.fileType },
            { id: 's', header: 'Size', cell: (r: MediaFileRow) => formatFileSize(r.fileSizeBytes) },
            { id: 'm', header: 'Module', cell: (r: MediaFileRow) => r.module },
            { id: 'u', header: 'Uploaded by', cell: (r: MediaFileRow) => r.uploadedBy },
            { id: 'd', header: 'Upload date', cell: (r: MediaFileRow) => fmtDate(r.createdAt) },
            ...(isThemePreviewPicker
              ? [
                  {
                    id: 'pick',
                    header: 'Use',
                    cell: (r: MediaFileRow) =>
                      r.fileType === 'image' ? (
                        <button type="button" className={adminBtnSecondary} onClick={() => pickForTheme(r)}>
                          Use this image
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Images only</span>
                      ),
                  },
                ]
              : []),
            {
              id: 'a',
              header: 'Actions',
              cell: (r: MediaFileRow) => (
                <button type="button" className={adminBtnSecondary} onClick={() => setDetail(r)}>
                  Details
                </button>
              ),
            },
          ]}
          rows={filtered}
          rowKey={(r) => r.fileId}
        />
      )}

      {filtered.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-slate-500">No files match filters.</p>
      ) : null}

      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setDetail(null)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">File details</h2>
              <p className="truncate text-xs text-slate-500">{detail.fileName}</p>
            </div>
            <div className="space-y-2 p-4 text-xs text-slate-700">
              {isThemePreviewPicker && detail.fileType === 'image' ? (
                <div>
                  <button type="button" className={adminBtnPrimary} onClick={() => pickForTheme(detail)}>
                    Use this image in Theme Upload
                  </button>
                </div>
              ) : null}
              <div>
                <span className="font-medium text-slate-500">URL</span>
                <div className="mt-0.5 break-all font-mono text-[11px]">{publicUrlForPath(detail.filePath)}</div>
              </div>
              <div>
                <span className="font-medium text-slate-500">Path</span>
                <div className="mt-0.5 font-mono text-[11px]">{detail.filePath}</div>
              </div>
              <div>
                <span className="font-medium text-slate-500">Size</span> {formatFileSize(detail.fileSizeBytes)}
              </div>
              <div>
                <span className="font-medium text-slate-500">Uploaded</span> {fmtDate(detail.createdAt)} ·{' '}
                {detail.uploadedBy}
              </div>
              <div>
                <span className="font-medium text-slate-500">Module</span> {detail.module} · folder{' '}
                <span className="font-mono">{folderName(detail.folderId)}</span>
              </div>
              <div>
                <span className="font-medium text-slate-500">Access</span> {detail.visibility}
              </div>
              {detail.description ? (
                <div>
                  <span className="font-medium text-slate-500">Description</span> {detail.description}
                </div>
              ) : null}
              {detail.tags.length ? (
                <div>
                  <span className="font-medium text-slate-500">Tags</span> {detail.tags.join(', ')}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                className={adminBtnSecondary}
                onClick={() => {
                  void navigator.clipboard.writeText(publicUrlForPath(detail.filePath));
                  window.alert('URL copied to clipboard.');
                }}
              >
                Copy URL
              </button>
              <button
                type="button"
                className={adminBtnSecondary}
                onClick={() => window.open(publicUrlForPath(detail.filePath), '_blank', 'noopener,noreferrer')}
              >
                Download
              </button>
              <button
                type="button"
                className={adminBtnSecondary}
                onClick={() => window.alert('Use Upload manager to add a replacement file.')}
              >
                Replace
              </button>
              <button
                type="button"
                className={adminBtnSecondary}
                onClick={() => {
                  if (window.confirm(`Delete ${detail.fileName}?`)) {
                    deleteFile(detail.fileId);
                    setDetail(null);
                  }
                }}
              >
                Delete
              </button>
              <button type="button" className={adminBtnPrimary} onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ResourcePanel>
  );
}
