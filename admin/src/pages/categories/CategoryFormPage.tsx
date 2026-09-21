import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CatalogTenantSelect } from '@/components/catalog/CatalogTenantSelect';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError, apiGet } from '@/lib/apiClient';
import { listAttributesWithMappings, type CatalogAttributeApiRow } from '@/lib/attributesApi';
import { createCategory, fetchCategories, fetchCategory, updateCategory, type CatalogCategory } from '@/lib/catalogApi';
import type { IndustryRow } from '@/lib/industriesDemoData';

type Props = { mode: 'create' | 'edit' };
type Form = {
  name: string; slug: string; parentId: string; industryId: string; description: string;
  status: 'active' | 'inactive' | 'archived'; sortOrder: string; attributeIds: string[];
  iconUrl: string; bannerUrl: string; thumbnailUrl: string;
  showInApp: boolean; showInWebsite: boolean; showInMenu: boolean;
};
const emptyForm: Form = { name: '', slug: '', parentId: '', industryId: '', description: '', status: 'active', sortOrder: '0', attributeIds: [], iconUrl: '', bannerUrl: '', thumbnailUrl: '', showInApp: true, showInWebsite: true, showInMenu: true };
const inputClass = 'w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900';
const labelClass = 'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function fromCategory(row: CatalogCategory): Form {
  return { name: row.name, slug: row.slug, parentId: row.parentId ?? '', industryId: row.industryId ?? '', description: row.description ?? '', status: row.status, sortOrder: String(row.sortOrder ?? 0), attributeIds: row.attributeIds ?? [], iconUrl: row.iconUrl ?? '', bannerUrl: row.bannerUrl ?? '', thumbnailUrl: row.thumbnailUrl ?? '', showInApp: row.showInApp, showInWebsite: row.showInWebsite, showInMenu: row.showInMenu };
}

export function CategoryFormPage({ mode }: Props) {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [scope, setScope] = useState(params.get('tenantId') || 'global');
  const [form, setForm] = useState<Form>(emptyForm);
  const [parents, setParents] = useState<CatalogCategory[]>([]);
  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [attributes, setAttributes] = useState<CatalogAttributeApiRow[]>([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === 'edit');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetchCategories({ globalOnly: scope === 'global', tenantId: scope === 'global' ? undefined : scope, includeGlobal: scope !== 'global', limit: 200 }),
      apiGet<IndustryRow[]>('/admin/industries'),
      listAttributesWithMappings({ globalOnly: scope === 'global', tenantId: scope === 'global' ? undefined : scope }),
      mode === 'edit' && id ? fetchCategory(id) : Promise.resolve(null),
    ]).then(([categoryResponse, industryRows, attributeRows, detail]) => {
      if (!active) return;
      setParents((categoryResponse.data ?? []).filter((row) => row.id !== id));
      setIndustries(industryRows);
      setAttributes(attributeRows);
      if (detail) {
        setForm(fromCategory(detail.data));
        const actualScope = detail.data.tenantId || 'global';
        setScope(actualScope);
        setParams(actualScope === 'global' ? {} : { tenantId: actualScope }, { replace: true });
      }
      setError(null);
    }).catch((cause) => setError(cause instanceof ApiError ? cause.message : 'Could not load category form.')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id, mode, scope, setParams]);

  const industryById = useMemo(() => new Map(industries.map((row) => [row.industryId, row.name])), [industries]);
  function changeScope(value: string) {
    setScope(value);
    setParams(value === 'global' ? {} : { tenantId: value }, { replace: true });
    setForm((current) => ({ ...current, parentId: '', attributeIds: [] }));
  }
  function toggleAttribute(attributeId: string) {
    setForm((current) => ({ ...current, attributeIds: current.attributeIds.includes(attributeId) ? current.attributeIds.filter((item) => item !== attributeId) : [...current.attributeIds, attributeId] }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const name = form.name.trim(); const slug = form.slug.trim();
    if (name.length < 2 || slug.length < 2) { setError('Category name and slug must contain at least 2 characters.'); return; }
    if (scope === 'global' && !form.industryId) { setError('Industry is required for a global category so apps can receive it.'); return; }
    const sortOrder = Number(form.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) { setError('Sort order must be a non-negative whole number.'); return; }
    setSaving(true); setError(null);
    const body = { ...(mode === 'create' && scope !== 'global' ? { tenantId: scope } : {}), name, slug, parentId: form.parentId || undefined, industryId: form.industryId || undefined, description: form.description.trim(), status: form.status, sortOrder, attributeIds: form.attributeIds, iconUrl: form.iconUrl.trim(), bannerUrl: form.bannerUrl.trim(), thumbnailUrl: form.thumbnailUrl.trim(), showInApp: form.showInApp, showInWebsite: form.showInWebsite, showInMenu: form.showInMenu };
    try {
      if (mode === 'edit' && id) await updateCategory(id, body); else await createCategory(body);
      navigate(`/categories${scope === 'global' ? '' : `?tenantId=${encodeURIComponent(scope)}`}`, { replace: true });
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Could not save category.'); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title={mode === 'create' ? 'Add category' : 'Edit category'} description="Saved to the live catalog API and used by tenant storefronts." actions={<><Link to={`/categories${scope === 'global' ? '' : `?tenantId=${encodeURIComponent(scope)}`}`} className={adminBtnSecondary}>← Categories</Link><button type="submit" className={adminBtnPrimary} disabled={saving || loading}>{saving ? 'Saving…' : 'Save category'}</button></>} />
      {error ? <div className="mb-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div> : null}
      <div className="mb-3"><CatalogTenantSelect allowGlobal value={scope} disabled={mode === 'edit'} onChange={changeScope} /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ResourcePanel title="Basic information"><div className="grid gap-3 p-3 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={labelClass}>Category name *</span><input className={inputClass} value={form.name} onChange={(e) => { const name = e.target.value; setForm((f) => ({ ...f, name, ...(!slugTouched ? { slug: slugify(name) } : {}) })); }} /></label>
          <label><span className={labelClass}>Slug *</span><input className={inputClass} value={form.slug} onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }} /></label>
          <label><span className={labelClass}>Sort order</span><input type="number" min="0" className={inputClass} value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} /></label>
          <label><span className={labelClass}>Parent</span><select className={inputClass} value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}><option value="">None (root)</option>{parents.map((row) => <option key={row.id} value={row.id}>{row.level > 1 ? '↳ ' : ''}{row.name}{row.tenantId == null ? ' · Global' : ''}</option>)}</select></label>
          <label><span className={labelClass}>Industry {scope === 'global' ? '*' : ''}</span><select className={inputClass} value={form.industryId} onChange={(e) => setForm((f) => ({ ...f, industryId: e.target.value }))}><option value="">Select industry</option>{industries.filter((row) => row.status === 'active' || row.industryId === form.industryId).map((row) => <option key={row.industryId} value={row.industryId}>{row.name}</option>)}</select></label>
          <label><span className={labelClass}>Status</span><select className={inputClass} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Form['status'] }))}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label>
          <label className="sm:col-span-2"><span className={labelClass}>Description</span><textarea className={`${inputClass} min-h-20`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
        </div></ResourcePanel>
        <ResourcePanel title="App, website and media"><div className="space-y-3 p-3">
          {(['iconUrl', 'thumbnailUrl', 'bannerUrl'] as const).map((key) => <label key={key}><span className={labelClass}>{key.replace('Url', ' URL')}</span><input className={inputClass} value={form[key]} placeholder="https://… or /storage/…" onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} /></label>)}
          {([['showInApp', 'Show in mobile app'], ['showInWebsite', 'Show on website'], ['showInMenu', 'Show in navigation menu']] as const).map(([key, text]) => <label key={key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form[key]} onChange={() => setForm((f) => ({ ...f, [key]: !f[key] }))} />{text}</label>)}
        </div></ResourcePanel>
        <div className="lg:col-span-2"><ResourcePanel title="Linked product attributes"><div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">{attributes.map((attribute) => <label key={attribute.id} className="flex items-center gap-2 rounded-sm border border-slate-100 p-2 text-xs"><input type="checkbox" checked={form.attributeIds.includes(attribute.id)} onChange={() => toggleAttribute(attribute.id)} /><span>{attribute.name}<span className="block text-[10px] text-slate-500">{attribute.dataType}{attribute.tenantId == null ? ' · Global' : ''}</span></span></label>)}</div>{!attributes.length ? <p className="p-3 text-xs text-slate-500">No compatible attributes found.</p> : null}</ResourcePanel></div>
      </div>
      {form.industryId ? <p className="mt-3 text-xs text-slate-500">Industry: {industryById.get(form.industryId) ?? form.industryId}</p> : null}
    </form>
  );
}
