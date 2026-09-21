import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError, apiGet } from '@/lib/apiClient';
import type { IndustryRow } from '@/lib/industriesDemoData';
import {
  createMasterBrand,
  getMasterBrand,
  updateMasterBrand,
  type MasterBrandRow,
} from '@/lib/masterBrandsApi';

type Mode = 'create' | 'edit';

const lbl =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inp = 'w-full max-w-lg rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900';

export function MasterBrandFormPage({ mode }: { mode: Mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [loadIndErr, setLoadIndErr] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [industryId, setIndustryId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [loading, setLoading] = useState(mode === 'edit');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await apiGet<IndustryRow[]>('/admin/industries');
        if (!cancelled) setIndustries(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setLoadIndErr('Could not load industries for dropdown.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSaveError(null);
      try {
        const row = await getMasterBrand(id);
        if (cancelled) return;
        setSaveError(null);
        applyRow(row);
      } catch (e) {
        if (!cancelled) setSaveError(e instanceof ApiError ? e.message : 'Failed to load brand');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, id]);

  function applyRow(row: MasterBrandRow) {
    setName(row.name);
    setSlug(row.slug);
    setLogoUrl(row.logoUrl ?? '');
    setIndustryId(row.industryId ?? '');
    setStatus(row.status === 'inactive' ? 'inactive' : 'active');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    const industryPayload = industryId.trim() === '' ? null : industryId.trim();
    try {
      if (mode === 'create') {
        await createMasterBrand({
          name: name.trim(),
          slug: slug.trim() || undefined,
          logoUrl: logoUrl.trim() || null,
          industryId: industryPayload,
          status,
        });
      } else if (id) {
        await updateMasterBrand(id, {
          name: name.trim(),
          slug: slug.trim(),
          logoUrl: logoUrl.trim() || null,
          industryId: industryPayload,
          status,
        });
      }
      navigate('/master-brands');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const title = mode === 'create' ? 'Add master brand' : `Edit master brand · ${name || id || ''}`;

  if (mode === 'edit' && loading) {
    return (
      <div>
        <PageHeader title={title} description="" />
        <ResourcePanel>
          <p className="p-3 text-xs text-slate-600">Loading…</p>
        </ResourcePanel>
      </div>
    );
  }

  if (mode === 'edit' && !loading && saveError && !name && id) {
    return (
      <div>
        <PageHeader title="Edit master brand" description="" />
        <ResourcePanel>
          <p className="p-3 text-xs text-red-700">{saveError}</p>
          <Link to="/master-brands" className={`${adminBtnSecondary} m-3 inline-block`}>
            ← Back to list
          </Link>
        </ResourcePanel>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={title}
        description="Name, slug (unique, case-insensitive), optional logo URL and industry. Inactive brands are hidden from distributor merged brand lists."
        actions={
          <Link to="/master-brands" className={adminBtnSecondary}>
            ← Master brands
          </Link>
        }
      />

      <ResourcePanel>
        <form className="max-w-xl space-y-4 p-3" onSubmit={(e) => void onSubmit(e)}>
          {loadIndErr ? <p className="text-[11px] text-amber-800">{loadIndErr}</p> : null}
          {saveError ? <p className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] text-red-900">{saveError}</p> : null}

          <div>
            <label className={lbl}>Name</label>
            <input className={inp} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Samsung" />
          </div>

          <div>
            <label className={lbl}>Slug</label>
            <input
              className={inp}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Leave empty on create to auto-generate from name"
              required={mode === 'edit'}
            />
            {mode === 'create' ? (
              <p className="mt-1 text-[10px] text-slate-500">If empty, slug is derived from the name.</p>
            ) : null}
          </div>

          <div>
            <label className={lbl}>Logo URL</label>
            <input className={inp} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <label className={lbl}>Industry (optional)</label>
            <select className={inp} value={industryId} onChange={(e) => setIndustryId(e.target.value)}>
              <option value="">— None —</option>
              {industries.map((i) => (
                <option key={i.industryId} value={i.industryId}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={lbl}>Status</label>
            <select className={inp} value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}>
              <option value="active">Active — shown in distributor brand options</option>
              <option value="inactive">Inactive — hidden from merged lists</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className={adminBtnPrimary} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <Link to="/master-brands" className={adminBtnSecondary}>
              Cancel
            </Link>
          </div>
        </form>
      </ResourcePanel>
    </div>
  );
}
