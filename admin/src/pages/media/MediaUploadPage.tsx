import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { useMediaManager } from '@/components/media/MediaManagerContext';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';
import { uploadAdminMedia, uploadThemePreviewImage } from '@/lib/mediaUploadApi';
import { publicUrlForPath, type MediaFileRow, type MediaFileType } from '@/lib/mediaModels';

function guessType(name: string): MediaFileType {
  const n = name.toLowerCase();
  if (/\.(png|jpe?g|webp)$/i.test(n)) return 'image';
  if (/\.pdf$/i.test(n)) return 'document';
  return 'other';
}

export function MediaUploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setFiles, folders, security } = useMediaManager();
  const [folderId, setFolderId] = useState(folders.find((f) => f.folderId !== 'root')?.folderId ?? 'fld-categories');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const selectableFolders = folders.filter((f) => f.folderId !== 'root');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      window.alert('Choose a file first.');
      return;
    }
    const pickTarget = searchParams.get('pickTarget');
    const returnTo = searchParams.get('returnTo');
    const pickField = searchParams.get('pickField');
    const isThemePreviewPick = pickTarget === 'theme-preview' && !!returnTo;
    const pathFolder = selectableFolders.find((f) => f.folderId === folderId)?.folderName ?? 'misc';

    setBusy(true);
    try {
      const uploaded = isThemePreviewPick ? await uploadThemePreviewImage(selectedFile) : null;
      const privateMedia = !isThemePreviewPick
        ? await uploadAdminMedia({
            file: selectedFile,
            folderId,
            module: 'Media',
            tags,
            description,
          })
        : null;
      const fileName = uploaded?.fileName ?? selectedFile.name;
      const filePath = uploaded?.url ?? `/media/${pathFolder}/${fileName}`;
      const newRow: MediaFileRow = privateMedia ?? {
        fileId: `mf-${Date.now()}`,
        fileName,
        filePath,
        fileType: guessType(fileName),
        fileSizeBytes: selectedFile.size,
        module: isThemePreviewPick ? 'Themes' : 'Upload',
        uploadedBy: 'Current admin',
        createdAt: new Date().toISOString(),
        folderId,
        visibility: 'public',
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        description: description.trim(),
      };
      setFiles((list) => [newRow, ...list]);
      if (isThemePreviewPick) {
        const url = publicUrlForPath(newRow.filePath);
        const sep = returnTo.includes('?') ? '&' : '?';
        const next = `${returnTo}${sep}pickedMediaUrl=${encodeURIComponent(url)}${
          pickField ? `&pickedMediaField=${encodeURIComponent(pickField)}` : ''
        }`;
        navigate(next);
        return;
      }
      setSelectedFile(null);
      setTags('');
      setDescription('');
      window.alert('File added to library.');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResourcePanel title="Upload manager">
      <form className="max-w-xl space-y-4 p-3" onSubmit={onSubmit}>
        <div>
          <label className={setLbl}>Folder</label>
          <select className={setInp} value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            {selectableFolders.map((f) => (
              <option key={f.folderId} value={f.folderId}>
                /media/{f.folderName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={setLbl}>File</label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
            className={setInp}
            onChange={(e) => {
              const f = e.target.files?.[0];
              setSelectedFile(f ?? null);
            }}
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Max {security.maxUploadMb} MB in settings. Types: {security.allowedExtensions}.
          </p>
        </div>
        <div>
          <label className={setLbl}>Tags (comma-separated)</label>
          <input
            className={setInp}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="banner, summer"
          />
        </div>
        <div>
          <label className={setLbl}>Description</label>
          <textarea className={`${setInp} min-h-[4rem]`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button type="submit" className={adminBtnPrimary} disabled={busy}>
          {busy ? 'Uploading...' : 'Upload to library'}
        </button>
      </form>
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Supported categories: images and PDF documents.
      </p>
    </ResourcePanel>
  );
}
