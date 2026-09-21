import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useIndustries } from '@/components/industries/IndustriesContext';
import { ApiError } from '@/lib/apiClient';
import type { IndustryStatus } from '@/lib/industriesDemoData';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';
import { getIndustryIconComponent } from '@/pages/industries/industryIcons';

const ICON_OPTIONS = [
  'Cpu',
  'Footprints',
  'Shirt',
  'Factory',
  'Cog',
  'Gem',
  'Store',
  'Box',
  'ShoppingBag',
  'Package',
  'Wrench',
  'HardHat',
] as const;

type Mode = 'create' | 'edit';

export function IndustryFormPage({ mode }: { mode: Mode }) {
  const { industryId } = useParams();
  const navigate = useNavigate();
  const { industries, industriesLoading, addIndustry, updateIndustry } = useIndustries();
  const existing = mode === 'edit' ? industries.find((i) => i.industryId === industryId) : undefined;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string>('Store');
  const [status, setStatus] = useState<IndustryStatus>('active');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && existing) {
      setName(existing.name);
      setDescription(existing.description);
      setIcon(existing.icon);
      setStatus(existing.status);
    }
    if (mode === 'create') {
      setName('');
      setDescription('');
      setIcon('Store');
      setStatus('active');
    }
  }, [mode, existing, industryId]);

  if (mode === 'edit' && industriesLoading) {
    return (
      <ResourcePanel title="Edit industry">
        <p className="p-3 text-xs text-slate-600">Loading…</p>
      </ResourcePanel>
    );
  }

  if (mode === 'edit' && !existing) {
    return (
      <ResourcePanel title="Edit industry">
        <p className="p-3 text-xs text-slate-600">Industry not found.</p>
        <Link to="/industries/list" className={`${adminBtnSecondary} m-3 inline-block`}>
          Back to list
        </Link>
      </ResourcePanel>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      icon: icon.trim() || 'Box',
      status,
    };
    try {
      if (mode === 'create') {
        await addIndustry(payload);
      } else if (existing) {
        await updateIndustry(existing.industryId, payload);
      }
      navigate('/industries/list');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const PreviewIcon = getIndustryIconComponent(icon);

  return (
    <ResourcePanel title={mode === 'create' ? 'Add industry' : `Edit — ${existing?.name ?? ''}`}>
      <form className="max-w-lg space-y-4 p-3" onSubmit={(e) => void onSubmit(e)}>
        {saveError ? (
          <p className="rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] text-red-900">{saveError}</p>
        ) : null}
        <div>
          <label className={setLbl}>Industry name</label>
          <input
            className={setInp}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Footwear"
            required
          />
        </div>
        <div>
          <label className={setLbl}>Description</label>
          <textarea
            className={setInp + ' min-h-[5rem]'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Shoe and footwear manufacturers and distributors."
            required
          />
        </div>
        <div>
          <label className={setLbl}>Icon (Lucide name)</label>
          <select className={setInp} value={icon} onChange={(e) => setIcon(e.target.value)}>
            {ICON_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            Preview: <PreviewIcon className="h-5 w-5 text-slate-800" />
            <span className="text-[10px] text-slate-500">Production: upload to CDN + store URL in DB.</span>
          </div>
        </div>
        <div>
          <label className={setLbl}>Status</label>
          <select
            className={setInp}
            value={status}
            onChange={(e) => setStatus(e.target.value as IndustryStatus)}
          >
            <option value="active">Active — visible to new distributors</option>
            <option value="inactive">Inactive — hidden from new distributor signup</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={adminBtnPrimary} disabled={saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Save industry' : 'Save changes'}
          </button>
          <Link to="/industries/list" className={adminBtnSecondary}>
            Cancel
          </Link>
        </div>
      </form>
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Persists to <span className="font-mono">industries</span> (name, description, icon, status, created_at).
      </p>
    </ResourcePanel>
  );
}
