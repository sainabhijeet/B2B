import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useThemes } from '@/components/themes/ThemesContext';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { THEME_INDUSTRY_OPTIONS } from '@/lib/themeDemoData';
import { themesLoadErrorMessage, uploadThemeZip } from '@/lib/themesApi';

const lbl =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inp =
  'w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs';
const THEME_UPLOAD_DRAFT_KEY = 'theme-upload-draft-v1';

type ThemeUploadDraft = {
  themeName: string;
  themeType: string;
  platform: 'web' | 'mobile';
  version: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
  description: string;
  demoHost: string;
  thumbnailUrl: string;
  previewImagesText: string;
};

function readDraft(): Partial<ThemeUploadDraft> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(THEME_UPLOAD_DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<ThemeUploadDraft>;
    if (!parsed || typeof parsed !== 'object') return {};
    if (parsed.thumbnailUrl && /(?:cdn\.platform\.example|example\.com)/i.test(parsed.thumbnailUrl)) {
      parsed.thumbnailUrl = '';
    }
    if (parsed.previewImagesText && /(?:cdn\.platform\.example|example\.com)/i.test(parsed.previewImagesText)) {
      parsed.previewImagesText = '';
    }
    return parsed;
  } catch {
    return {};
  }
}

function firstPreviewUrl(raw: string): string | null {
  const parts = raw
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts[0] ?? null;
}

export function ThemeUploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draft = readDraft();
  const { reloadThemes } = useThemes();
  const [themeName, setThemeName] = useState(draft.themeName ?? '');
  const [themeType, setThemeType] = useState(draft.themeType ?? 'generic');
  const [platform, setPlatform] = useState<'web' | 'mobile'>(draft.platform ?? 'web');
  const [version, setVersion] = useState(draft.version ?? '1.0');
  const [slug, setSlug] = useState(draft.slug ?? '');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(draft.status ?? 'ACTIVE');
  const [description, setDescription] = useState(draft.description ?? '');
  const [demoHost, setDemoHost] = useState(draft.demoHost ?? '');
  const [thumbnailUrl, setThumbnailUrl] = useState(draft.thumbnailUrl ?? '');
  const [previewImagesText, setPreviewImagesText] = useState(draft.previewImagesText ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const payload: ThemeUploadDraft = {
      themeName,
      themeType,
      platform,
      version,
      slug,
      status,
      description,
      demoHost,
      thumbnailUrl,
      previewImagesText,
    };
    window.sessionStorage.setItem(THEME_UPLOAD_DRAFT_KEY, JSON.stringify(payload));
  }, [themeName, themeType, platform, version, slug, status, description, demoHost, thumbnailUrl, previewImagesText]);

  useEffect(() => {
    const pickedMediaUrl = searchParams.get('pickedMediaUrl');
    const pickedMediaField = searchParams.get('pickedMediaField');
    if (!pickedMediaUrl) return;
    if (pickedMediaField === 'thumbnail') {
      setThumbnailUrl(pickedMediaUrl);
    } else {
      setPreviewImagesText((prev) => {
        const existing = prev
          .split(/[\n,]/g)
          .map((s) => s.trim())
          .filter(Boolean);
        if (existing.includes(pickedMediaUrl)) return prev;
        return prev.trim() ? `${prev}\n${pickedMediaUrl}` : pickedMediaUrl;
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('pickedMediaUrl');
    next.delete('pickedMediaField');
    navigate({ search: next.toString() ? `?${next.toString()}` : '' }, { replace: true });
  }, [searchParams, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!file) {
      setError('Choose a .zip theme package.');
      return;
    }
    if (!themeName.trim()) {
      setError('Theme name is required.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('themeName', themeName.trim());
      fd.append('themeType', themeType.trim());
      fd.append('platform', platform);
      fd.append('version', version.trim() || '1.0');
      fd.append('status', status);
      if (slug.trim()) fd.append('slug', slug.trim());
      if (description.trim()) fd.append('description', description.trim());
      if (demoHost.trim()) fd.append('demoHost', demoHost.trim());
      if (thumbnailUrl.trim()) fd.append('previewImage', thumbnailUrl.trim());
      if (previewImagesText.trim()) fd.append('previewImagesText', previewImagesText.trim());
      let row;
      try {
        row = await uploadThemeZip(fd);
      } catch (err) {
        // Backward compatibility: older backend may not yet accept previewImagesText.
        if (
          err instanceof ApiError &&
          err.status === 400 &&
          /previewImagesText/i.test(err.message)
        ) {
          const fallback = new FormData();
          fallback.append('file', file);
          fallback.append('themeName', themeName.trim());
          fallback.append('themeType', themeType.trim());
          fallback.append('platform', platform);
          fallback.append('version', version.trim() || '1.0');
          fallback.append('status', status);
          if (slug.trim()) fallback.append('slug', slug.trim());
          if (description.trim()) fallback.append('description', description.trim());
          if (demoHost.trim()) fallback.append('demoHost', demoHost.trim());
          const first = firstPreviewUrl(previewImagesText);
          if (first) fallback.append('previewImage', first);
          row = await uploadThemeZip(fallback);
        } else {
          throw err;
        }
      }
      setMessage(`Saved: ${row.themeName} (${row.themeChannel ?? platform}).`);
      setFile(null);
      window.sessionStorage.removeItem(THEME_UPLOAD_DRAFT_KEY);
      await reloadThemes();
      navigate(`/themes/${row.id}/edit`, { replace: true });
    } catch (err) {
      setError(themesLoadErrorMessage(err));
      if (err instanceof ApiError && err.status === 403) {
        setError(`${themesLoadErrorMessage(err)} — only SUPER_ADMIN may upload.`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <strong className="font-medium text-slate-900">ZIP upload (live):</strong>{' '}
        <span className="font-mono">POST /api/v1/themes/upload</span> registers the package and exposes assets via{' '}
        <span className="font-mono">manifestPath</span> on the theme record. Requires <strong>SUPER_ADMIN</strong> JWT.
      </div>

      <ResourcePanel title="Upload theme package">
        <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 p-3 sm:grid-cols-2">
          <div>
            <label className={lbl}>Theme name</label>
            <input
              className={inp}
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
              placeholder="e.g. Modern Web"
              required
            />
          </div>
          <div>
            <label className={lbl}>Industry / Theme family</label>
            <select className={inp} value={themeType} onChange={(e) => setThemeType(e.target.value)} required>
              {THEME_INDUSTRY_OPTIONS.map((i) => (
                <option key={i} value={i.toLowerCase()}>
                  {i}
                </option>
              ))}
              <option value="generic">Generic</option>
            </select>
            <p className="mt-1 text-[10px] text-slate-500">
              Backend me yahi value <span className="font-mono">themeType</span> ke roop me save hoti hai.
            </p>
          </div>
          <div>
            <label className={lbl}>Platform</label>
            <select
              className={inp}
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'web' | 'mobile')}
            >
              <option value="web">Web (storefront bundle)</option>
              <option value="mobile">Mobile (app shell)</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Version</label>
            <input className={inp} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" />
          </div>
          <div>
            <label className={lbl}>Slug (optional)</label>
            <input
              className={inp}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto from name if empty — lowercase-kebab"
            />
          </div>
          <div>
            <label className={lbl}>Status</label>
            <select
              className={inp}
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Primary preview image (optional)</label>
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                className={`${inp} flex-1`}
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Leave empty to auto-detect the hero image from the ZIP"
              />
              <Link
                to={`/media/upload?pickTarget=theme-preview&pickField=thumbnail&returnTo=${encodeURIComponent('/themes/upload')}`}
                className={adminBtnSecondary}
              >
                Upload from media
              </Link>
              <Link
                to={`/media/library?pickTarget=theme-preview&pickField=thumbnail&returnTo=${encodeURIComponent('/themes/upload')}`}
                className={adminBtnSecondary}
              >
                Choose existing
              </Link>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Empty chhodne par package ke home template/hero asset se thumbnail automatically detect hogi.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Preview image URLs (optional, multiple)</label>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Link
                to={`/media/upload?pickTarget=theme-preview&pickField=preview&returnTo=${encodeURIComponent('/themes/upload')}`}
                className={adminBtnSecondary}
              >
                Upload from media
              </Link>
              <Link
                to={`/media/library?pickTarget=theme-preview&pickField=preview&returnTo=${encodeURIComponent('/themes/upload')}`}
                className={adminBtnSecondary}
              >
                Choose existing
              </Link>
            </div>
            <textarea
              className={`${inp} min-h-[4rem]`}
              value={previewImagesText}
              onChange={(e) => setPreviewImagesText(e.target.value)}
              placeholder={'Optional: one public or /storage/ image path per line'}
            />
            <p className="mt-1 text-[10px] text-slate-500">
              One URL per line (or comma-separated). First valid URL becomes default card image.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Demo host (optional)</label>
            <input
              className={inp}
              value={demoHost}
              onChange={(e) => setDemoHost(e.target.value)}
              placeholder="demo.example.com — stored in theme_config_json"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Description (optional)</label>
            <textarea
              className={`${inp} min-h-[3rem]`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={lbl}>Theme package (.zip)</label>
            <input
              type="file"
              accept=".zip,application/zip"
              className="block text-xs text-slate-600"
              onChange={(e) => {
                const nextFile = e.target.files?.[0] ?? null;
                setFile(nextFile);
                if (!nextFile) return;
                const stem = nextFile.name
                  .replace(/\.zip$/i, '')
                  .replace(/-theme$/i, '')
                  .replace(/[-_]+/g, ' ')
                  .trim();
                if (!themeName.trim() && stem) {
                  setThemeName(stem.replace(/\b\w/g, (c) => c.toUpperCase()));
                }
                if (!slug.trim() && stem) {
                  setSlug(
                    stem
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, ''),
                  );
                }
              }}
            />
            {file ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                <span className="font-semibold">Ready to validate</span>
                <span>{file.name}</span>
                <span>· {(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ) : (
              <p className="mt-1 text-[10px] text-slate-500">ZIP is validated before publishing; invalid manifests or missing templates are rejected safely.</p>
            )}
          </div>

          {error ? (
            <div className="sm:col-span-2 rounded-sm border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="sm:col-span-2 rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-950">
              {message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1.5 sm:col-span-2">
            <button type="submit" className={adminBtnPrimary} disabled={busy}>
              {busy ? 'Uploading…' : 'Upload & save'}
            </button>
            <Link to="/themes/list" className={adminBtnSecondary}>
              Cancel
            </Link>
          </div>
        </form>
      </ResourcePanel>
    </div>
  );
}
