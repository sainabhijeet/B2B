import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import {
  createAdCampaign,
  fetchAdCampaign,
  updateAdCampaign,
} from '@/lib/adsApi';
import {
  AD_COUNTRY_OPTIONS,
  AD_INDUSTRY_OPTIONS,
  AD_PLACEMENT_OPTIONS,
  AD_TYPE_OPTIONS,
} from '@/lib/adsDemoData';
import {
  type AdsCampaignFormValues,
  campaignToFormValues,
  formValuesToCreatePayload,
  type UiAdType,
  type UiCampaignStatus,
  type UiDeviceType,
  type UiPlanTarget,
} from '@/lib/adsFormMaps';

const lbl =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inp =
  'w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs';

const defaultForm = (): AdsCampaignFormValues => ({
  name: '',
  adType: 'banner_ad',
  placement: AD_PLACEMENT_OPTIONS[0] ?? 'App Home Banner',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
  status: 'scheduled',
  industry: AD_INDUSTRY_OPTIONS[0] ?? '',
  country: AD_COUNTRY_OPTIONS[0] ?? '',
  deviceType: 'all',
  planTarget: 'free_only',
});

export function AdsCampaignFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;
  const [form, setForm] = useState<AdsCampaignFormValues>(defaultForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || !id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const c = await fetchAdCampaign(id);
        if (!cancelled) setForm(campaignToFormValues(c));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Failed to load campaign.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  async function onSave() {
    setError(null);
    setSaving(true);
    try {
      if (isNew) {
        await createAdCampaign(formValuesToCreatePayload(form));
      } else if (id) {
        await updateAdCampaign(id, formValuesToCreatePayload(form));
      }
      navigate('/ads/campaigns');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-slate-500">Loading campaign…</p>;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">{error}</div>
      ) : null}
      <ResourcePanel title={isNew ? 'Create campaign' : 'Edit campaign'}>
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          <div>
            <label className={lbl}>Campaign name</label>
            <input
              className={inp}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Summer Tools Offer"
            />
          </div>
          <div>
            <label className={lbl}>Ad type</label>
            <select
              className={inp}
              value={form.adType}
              onChange={(e) => setForm((f) => ({ ...f, adType: e.target.value as UiAdType }))}
            >
              {AD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Placement</label>
            <select
              className={inp}
              value={form.placement}
              onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}
            >
              {AD_PLACEMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Status</label>
            <select
              className={inp}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as UiCampaignStatus }))}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="scheduled">Scheduled</option>
              <option value="ended">Ended</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Start date</label>
            <input
              type="date"
              className={inp}
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className={lbl}>End date</label>
            <input
              type="date"
              className={inp}
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <div>
            <label className={lbl}>Industry</label>
            <select
              className={inp}
              value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            >
              {AD_INDUSTRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Country</label>
            <select
              className={inp}
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            >
              {AD_COUNTRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>Device type</label>
            <select
              className={inp}
              value={form.deviceType}
              onChange={(e) => setForm((f) => ({ ...f, deviceType: e.target.value as UiDeviceType }))}
            >
              <option value="all">All devices</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
              <option value="desktop">Desktop</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Plan targeting</label>
            <select
              className={inp}
              value={form.planTarget}
              onChange={(e) => setForm((f) => ({ ...f, planTarget: e.target.value as UiPlanTarget }))}
            >
              <option value="free_only">Free users only</option>
              <option value="all_plans">All plans (override — delivery still gated by plan limits)</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2">
          <button type="button" className={adminBtnPrimary} disabled={saving} onClick={() => void onSave()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link to="/ads/campaigns" className={adminBtnSecondary}>
            Cancel
          </Link>
        </div>
      </ResourcePanel>
      <p className="text-xs text-slate-500">
        Paid tenants stay ad-free via backend <span className="font-mono">ads_enabled</span>; keep plan targeting on
        free-only for clarity.
      </p>
    </div>
  );
}
