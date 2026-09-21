import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useThemes } from '@/components/themes/ThemesContext';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';

export function ThemeDashboardPage() {
  const { themes, themesLoading, themesError, reloadThemes } = useThemes();

  const stats = useMemo(() => {
    const active = themes.filter((t) => String(t.status).toUpperCase() === 'ACTIVE').length;
    const web = themes.filter((t) => (t.themeChannel ?? 'WEB') === 'WEB').length;
    const mobile = themes.filter((t) => t.themeChannel === 'MOBILE').length;
    const withPreview = themes.filter((t) => Boolean(t.previewImage)).length;
    return { total: themes.length, active, web, mobile, withPreview };
  }, [themes]);

  return (
    <div className="space-y-4">
      {themesError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {themesError}{' '}
          <button type="button" className="font-medium underline" onClick={() => void reloadThemes()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total themes" value={stats.total} loading={themesLoading} hint="All registered packages" />
        <Metric label="Published" value={stats.active} loading={themesLoading} hint="Visible to distributors" tone="emerald" />
        <Metric label="Web" value={stats.web} loading={themesLoading} hint="Storefront bundles" />
        <Metric label="Mobile" value={stats.mobile} loading={themesLoading} hint="Application themes" />
        <Metric label="With preview" value={stats.withPreview} loading={themesLoading} hint="Gallery-ready themes" tone="indigo" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Theme publishing workflow</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <WorkflowStep number="1" title="Upload" text="Add a WEB or MOBILE ZIP package." />
            <WorkflowStep number="2" title="Validate" text="Manifest, templates and assets are checked automatically." />
            <WorkflowStep number="3" title="Publish" text="Active themes appear in the distributor gallery." />
          </div>
        </div>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-950">Quick actions</p>
          <div className="mt-3 grid gap-2">
            <Link to="/themes/upload" className={adminBtnPrimary}>Upload new theme</Link>
            <Link to="/themes/list" className={adminBtnSecondary}>Open catalog</Link>
            <Link to="/themes/combo-packs" className={adminBtnSecondary}>Manage combo packs</Link>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        Preview images are detected from packaged hero assets when no external image is supplied. Inactive themes remain manageable here but are hidden from distributors.
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  loading,
  hint,
  tone = 'slate',
}: {
  label: string;
  value: number;
  loading: boolean;
  hint: string;
  tone?: 'slate' | 'emerald' | 'indigo';
}) {
  const valueClass =
    tone === 'emerald' ? 'text-emerald-700' : tone === 'indigo' ? 'text-indigo-700' : 'text-slate-900';
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${valueClass}`}>{loading ? '…' : value}</div>
      <p className="mt-1 text-[10px] text-slate-500">{hint}</p>
    </div>
  );
}

function WorkflowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">{number}</span>
      <p className="mt-2 text-xs font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{text}</p>
    </div>
  );
}
