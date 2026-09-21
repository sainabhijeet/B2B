import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { storageUrl } from '@/lib/apiBase';
import {
  demoHostToUrl,
  readDemoHost,
  readThemeDescription,
  readThemePreviewImages,
  updateThemeMetadata,
  type ApiTheme,
} from '@/lib/themesApi';

const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inputClass =
  'w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export function CatalogThemeEditor({
  theme,
  onSaved,
}: {
  theme: ApiTheme;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(theme.themeName);
  const [family, setFamily] = useState(theme.themeType);
  const [version, setVersion] = useState(theme.themeVersion ?? '1.0');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(
    String(theme.status).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  );
  const [description, setDescription] = useState(readThemeDescription(theme.themeConfigJson));
  const [demoHost, setDemoHost] = useState(readDemoHost(theme.themeConfigJson) ?? '');
  const [previewImage, setPreviewImage] = useState(theme.previewImage ?? '');
  const [previewImagesText, setPreviewImagesText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(theme.themeName);
    setFamily(theme.themeType);
    setVersion(theme.themeVersion ?? '1.0');
    setStatus(String(theme.status).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
    setDescription(readThemeDescription(theme.themeConfigJson));
    setDemoHost(readDemoHost(theme.themeConfigJson) ?? '');
    setPreviewImage(theme.previewImage ?? '');
    setPreviewImagesText(
      (theme.previewImages?.length
        ? theme.previewImages
        : readThemePreviewImages(theme.themeConfigJson)
      ).join('\n'),
    );
  }, [theme]);

  const packageHealth = useMemo(() => {
    const manifest =
      theme.themeConfigJson?.manifest &&
      typeof theme.themeConfigJson.manifest === 'object' &&
      !Array.isArray(theme.themeConfigJson.manifest)
        ? (theme.themeConfigJson.manifest as Record<string, unknown>)
        : null;
    const templates =
      manifest?.templates && typeof manifest.templates === 'object'
        ? Object.keys(manifest.templates as Record<string, unknown>)
        : [];
    const allowed = Array.isArray(manifest?.allowedSections)
      ? manifest.allowedSections
      : Array.isArray(manifest?.allowed_sections)
        ? manifest.allowed_sections
        : [];
    return { manifest, templates, allowed };
  }, [theme.themeConfigJson]);
  const previewImageSrc = storageUrl(previewImage);

  async function save() {
    if (!name.trim() || !family.trim()) {
      setError('Theme name and family are required.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateThemeMetadata(theme.id, {
        themeName: name.trim(),
        themeType: family.trim(),
        version: version.trim(),
        status,
        description: description.trim(),
        demoHost: demoHost.trim(),
        previewImage: previewImage.trim(),
        previewImagesText: previewImagesText.trim(),
      });
      await onSaved();
      setMessage('Theme details saved successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save theme.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Theme · ${theme.themeName}`}
        description="Manage catalog metadata, publishing status and preview media. The validated package remains versioned and immutable."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Link to="/themes/list" className={adminBtnSecondary}>← All themes</Link>
            <Link to={`/themes/${theme.id}/preview`} className={adminBtnSecondary}>Preview</Link>
            {demoHost ? (
              <a href={demoHostToUrl(demoHost)} target="_blank" rel="noreferrer" className={adminBtnSecondary}>
                Live demo
              </a>
            ) : null}
            <button type="button" className={adminBtnPrimary} disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        }
      />

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{message}</div> : null}
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ResourcePanel title="Catalog details">
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <Field label="Display name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Theme family"><input className={inputClass} value={family} onChange={(e) => setFamily(e.target.value)} /></Field>
            <Field label="Version"><input className={inputClass} value={version} onChange={(e) => setVersion(e.target.value)} /></Field>
            <Field label="Publishing status">
              <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="ACTIVE">Active — available to distributors</option>
                <option value="INACTIVE">Inactive — hidden from selection</option>
              </select>
            </Field>
            <Field label="Description" wide><textarea className={`${inputClass} min-h-20`} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <Field label="Demo storefront URL or host" wide><input className={inputClass} value={demoHost} onChange={(e) => setDemoHost(e.target.value)} placeholder="store.example.com" /></Field>
            <Field label="Primary preview image" wide>
              <input className={inputClass} value={previewImage} onChange={(e) => setPreviewImage(e.target.value)} placeholder="/storage/themes/web/slug/assets/images/hero.png" />
              <p className="mt-1 text-[10px] text-slate-500">Packaged assets may use a portable `/storage/...` path.</p>
            </Field>
            <Field label="Preview gallery · one URL per line" wide><textarea className={`${inputClass} min-h-24 font-mono text-[10px]`} value={previewImagesText} onChange={(e) => setPreviewImagesText(e.target.value)} /></Field>
          </div>
        </ResourcePanel>

        <div className="space-y-4">
          <ResourcePanel title="Card preview">
            <div className="p-3">
              <div className="aspect-[16/10] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {previewImageSrc ? <img src={previewImageSrc} alt="" className="h-full w-full object-cover object-top" /> : <div className="flex h-full items-center justify-center text-xs text-slate-500">Auto-detected on upload</div>}
              </div>
              <p className="mt-3 font-medium text-slate-900">{name || 'Theme name'}</p>
              <p className="text-xs text-slate-500">{family || 'Theme family'} · v{version || '1.0'}</p>
            </div>
          </ResourcePanel>
          <ResourcePanel title="Package health">
            <dl className="grid gap-2 p-3 text-xs">
              <Health label="Channel" value={theme.themeChannel ?? 'WEB'} />
              <Health label="Slug" value={theme.slug ?? '—'} mono />
              <Health label="Templates" value={String(packageHealth.templates.length)} />
              <Health label="Allowed sections" value={String(packageHealth.allowed.length)} />
              <Health label="Manifest" value={packageHealth.manifest ? 'Valid' : 'Unavailable'} good={Boolean(packageHealth.manifest)} />
            </dl>
          </ResourcePanel>
        </div>
      </div>

      <details className="rounded-md border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-700">Advanced · system information</summary>
        <div className="grid gap-3 border-t border-slate-100 p-3 text-xs sm:grid-cols-2">
          <div><p className={labelClass}>Theme ID</p><code className="text-[10px]">{theme.id}</code></div>
          <div><p className={labelClass}>Created</p><span>{new Date(theme.createdAt).toLocaleString()}</span></div>
          <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-3 text-[10px] leading-relaxed text-slate-200 sm:col-span-2">{JSON.stringify(theme.themeConfigJson ?? {}, null, 2)}</pre>
        </div>
      </details>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <div className={wide ? 'sm:col-span-2' : undefined}><label className={labelClass}>{label}</label>{children}</div>;
}

function Health({ label, value, mono, good }: { label: string; value: string; mono?: boolean; good?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`${mono ? 'font-mono text-[10px]' : 'font-medium'} ${good ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</dd>
    </div>
  );
}
