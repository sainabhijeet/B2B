import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import type { PlanFormState } from '@/lib/planDemoData';
import { getPlanFormState } from '@/lib/planDemoData';
import { FEATURE_GROUP_ORDER, PLATFORM_FEATURES } from '@/lib/platformFeatureRegistry';

type PlanFormPageProps = { mode: 'create' | 'edit' };

const lbl =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inp =
  'w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900';

const TABS = [
  { id: 'basic', label: 'Basic info' },
  { id: 'features', label: 'Feature access' },
  { id: 'limits', label: 'Usage limits' },
  { id: 'build', label: 'Build & API / notify' },
  { id: 'billing', label: 'Billing' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function ToggleRow({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0">
      <span className="text-xs text-slate-800">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={[
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          on ? 'bg-indigo-600' : 'bg-slate-200',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            on ? 'left-4' : 'left-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export function PlanFormPage({ mode }: PlanFormPageProps) {
  const { id } = useParams();
  const [tab, setTab] = useState<TabId>('basic');
  const [form, setForm] = useState<PlanFormState>(() =>
    getPlanFormState(mode === 'edit' ? id : undefined),
  );

  useEffect(() => {
    setForm(getPlanFormState(mode === 'edit' ? id : undefined));
    setTab('basic');
  }, [id, mode]);

  function setBasic<K extends keyof PlanFormState['basic']>(key: K, v: PlanFormState['basic'][K]) {
    setForm((f) => ({ ...f, basic: { ...f.basic, [key]: v } }));
  }

  function toggleFeature(key: string) {
    setForm((f) => ({
      ...f,
      features: { ...f.features, [key]: !f.features[key] },
    }));
  }

  function setLimits<K extends keyof PlanFormState['limits']>(
    key: K,
    v: PlanFormState['limits'][K],
  ) {
    setForm((f) => ({ ...f, limits: { ...f.limits, [key]: v } }));
  }

  function setBuild<K extends keyof PlanFormState['build']>(key: K, v: PlanFormState['build'][K]) {
    setForm((f) => ({ ...f, build: { ...f.build, [key]: v } }));
  }

  function setBilling<K extends keyof PlanFormState['billing']>(
    key: K,
    v: PlanFormState['billing'][K],
  ) {
    setForm((f) => ({ ...f, billing: { ...f.billing, [key]: v } }));
  }

  const title = mode === 'create' ? 'Create plan' : `Edit plan · ${form.basic.name || id}`;

  return (
    <div>
      <PageHeader
        title={title}
        description="Sections mirror plans / plan_features / plan_limits when persisted."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Link to="/subscriptions/plans" className={adminBtnSecondary}>
              ← Plans list
            </Link>
            <button type="button" className={adminBtnPrimary} onClick={(e) => e.preventDefault()}>
              Save (demo)
            </button>
          </div>
        }
      />

      <div className="-mx-1 mb-4 overflow-x-auto border-b border-slate-200">
        <nav className="flex min-w-max gap-px px-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                tab === t.id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'basic' ? (
        <ResourcePanel title="Plan basic information">
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={lbl}>Plan name</label>
              <input
                className={inp}
                value={form.basic.name}
                onChange={(e) => setBasic('name', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Plan description</label>
              <textarea
                className={`${inp} min-h-[4rem] resize-y`}
                value={form.basic.description}
                onChange={(e) => setBasic('description', e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Price</label>
              <input
                className={inp}
                value={form.basic.price}
                onChange={(e) => setBasic('price', e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Currency</label>
              <select
                className={inp}
                value={form.basic.currency}
                onChange={(e) => setBasic('currency', e.target.value)}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Billing cycle</label>
              <select
                className={inp}
                value={form.basic.billingCycle}
                onChange={(e) =>
                  setBasic('billingCycle', e.target.value as PlanFormState['basic']['billingCycle'])
                }
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Trial period (days)</label>
              <input
                className={inp}
                inputMode="numeric"
                value={form.basic.trialDays}
                onChange={(e) => setBasic('trialDays', e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select
                className={inp}
                value={form.basic.status}
                onChange={(e) =>
                  setBasic('status', e.target.value as PlanFormState['basic']['status'])
                }
              >
                <option value="active">Active</option>
                <option value="hidden">Hidden (not shown to new signups)</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </ResourcePanel>
      ) : null}

      {tab === 'features' ? (
        <ResourcePanel title="Feature access control (all modules)">
          {FEATURE_GROUP_ORDER.map((group) => {
            const items = PLATFORM_FEATURES.filter((f) => f.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <div className="border-b border-slate-100 bg-slate-50/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  {group}
                </div>
                {items.map((f) => (
                  <ToggleRow
                    key={f.id}
                    label={f.label}
                    on={!!form.features[f.id]}
                    onToggle={() => toggleFeature(f.id)}
                  />
                ))}
              </div>
            );
          })}
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
            Abhi list <strong>frontend registry</strong> se aati hai (
            <code className="text-xs">platformFeatureRegistry.ts</code>). Backend connect par isi jagah{' '}
            <code className="text-xs">GET /admin/platform-features</code> (ya plan payload) se bhi bhar
            sakte ho — magic automatic nahi; API design karni hogi.
          </p>
        </ResourcePanel>
      ) : null}

      {tab === 'limits' ? (
        <ResourcePanel title="Usage limits">
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            {(
              [
                ['maxProducts', 'Max products'],
                ['maxCustomers', 'Max customers'],
                ['maxWarehouses', 'Max warehouses'],
                ['maxStaff', 'Max staff users'],
                ['maxNotificationsMonth', 'Max notifications / month'],
                ['maxApiPerDay', 'Max API requests / day'],
                ['storageLimit', 'Storage limit'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className={lbl}>{label}</label>
                <input
                  className={inp}
                  value={form.limits[key]}
                  onChange={(e) => setLimits(key, e.target.value)}
                  placeholder="e.g. 100, Unlimited, 1 GB"
                />
              </div>
            ))}
          </div>
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
            Maps to <code className="text-xs">plan_limits</code>.
          </p>
        </ResourcePanel>
      ) : null}

      {tab === 'build' ? (
        <div className="space-y-4">
          <ResourcePanel title="Build limits">
            <div className="grid gap-3 p-3 sm:grid-cols-2">
              <div>
                <label className={lbl}>Max app builds / month</label>
                <input
                  className={inp}
                  value={form.build.maxBuildsPerMonth}
                  onChange={(e) => setBuild('maxBuildsPerMonth', e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Build priority</label>
                <select
                  className={inp}
                  value={form.build.priority}
                  onChange={(e) =>
                    setBuild('priority', e.target.value as PlanFormState['build']['priority'])
                  }
                >
                  <option value="normal">Normal queue</option>
                  <option value="priority">Priority queue</option>
                </select>
              </div>
            </div>
          </ResourcePanel>
          <ResourcePanel title="Notification & API (summary)">
            <div className="px-3 py-2 text-xs text-slate-600">
              Detailed caps: see <strong>Usage limits</strong> tab (
              <em>Max notifications / month</em>, <em>Max API requests / day</em>).
            </div>
          </ResourcePanel>
        </div>
      ) : null}

      {tab === 'billing' ? (
        <ResourcePanel title="Billing settings">
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div>
              <label className={lbl}>List price (display)</label>
              <p className="text-xs text-slate-500">
                Use Basic info → Price for base amount; override with discount below.
              </p>
            </div>
            <div>
              <label className={lbl}>Discount (%)</label>
              <input
                className={inp}
                value={form.billing.discountPercent}
                onChange={(e) => setBilling('discountPercent', e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Tax (%)</label>
              <input
                className={inp}
                value={form.billing.taxPercent}
                onChange={(e) => setBilling('taxPercent', e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Renewal reminder (days before)</label>
              <input
                className={inp}
                value={form.billing.renewalReminderDays}
                onChange={(e) => setBilling('renewalReminderDays', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Grace period after expiry (days)</label>
              <input
                className={inp}
                value={form.billing.gracePeriodDays}
                onChange={(e) => setBilling('gracePeriodDays', e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Expiry ke baad service itne din chal sakti hai before hard suspend.
              </p>
            </div>
          </div>
        </ResourcePanel>
      ) : null}
    </div>
  );
}
