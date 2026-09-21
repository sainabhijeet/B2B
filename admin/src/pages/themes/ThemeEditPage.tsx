import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useThemes } from '@/components/themes/ThemesContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import type { ApiTheme } from '@/lib/themesApi';
import { demoHostToUrl, readDemoHost, readThemeDescription } from '@/lib/themesApi';
import {
  THEME_INDUSTRY_OPTIONS,
  getThemeFormState,
  type ThemeCompatibility,
  type ThemeFormState,
  type ThemeStatus,
} from '@/lib/themeDemoData';
import { CatalogThemeEditor } from './CatalogThemeEditor';

const lbl =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inp =
  'w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs';

const TABS = [
  { id: 'basic', label: 'Basic info' },
  { id: 'industry', label: 'Industry mapping' },
  { id: 'settings', label: 'Theme settings' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTabId(s: string | null): s is TabId {
  return TABS.some((t) => t.id === s);
}

function isUuidParam(s: string | undefined): boolean {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function fmtIso(iso: string) {
  try {
    return new Date(iso).toISOString();
  } catch {
    return iso;
  }
}

export function CatalogThemeReadonly({ theme }: { theme: ApiTheme }) {
  const demo = readDemoHost(theme.themeConfigJson);
  const desc = readThemeDescription(theme.themeConfigJson);
  return (
    <div className="space-y-4">
      <PageHeader
        title={`Theme · ${theme.themeName}`}
        description="Read-only view of the `themes` row. Admin PATCH / upload API not wired yet — use migrations or a future endpoint to change packages."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Link to="/themes/list" className={adminBtnSecondary}>
              ← All themes
            </Link>
            <Link to={`/themes/${theme.id}/preview`} className={adminBtnSecondary}>
              Preview mock
            </Link>
            {demo ? (
              <a
                href={demoHostToUrl(demo)}
                target="_blank"
                rel="noreferrer"
                className="rounded-sm border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-800 hover:bg-indigo-100"
              >
                Live demo
              </a>
            ) : null}
          </div>
        }
      />

      <ResourcePanel title="Core fields">
        <dl className="grid gap-2 p-3 text-xs sm:grid-cols-2">
          <div>
            <dt className={lbl}>Theme ID</dt>
            <dd className="font-mono text-[10px] text-slate-800">{theme.id}</dd>
          </div>
          <div>
            <dt className={lbl}>Status</dt>
            <dd className="font-medium text-slate-800">{theme.status}</dd>
          </div>
          <div>
            <dt className={lbl}>Display name</dt>
            <dd className="font-medium text-slate-800">{theme.themeName}</dd>
          </div>
          <div>
            <dt className={lbl}>Storefront type</dt>
            <dd className="text-slate-800">{theme.themeType}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className={lbl}>Description (config)</dt>
            <dd className="text-slate-700">{desc || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className={lbl}>Demo host (config)</dt>
            <dd className="text-slate-800">{demo || '—'}</dd>
          </div>
          <div>
            <dt className={lbl}>Theme version</dt>
            <dd className="text-slate-800">{theme.themeVersion ?? '—'}</dd>
          </div>
          <div>
            <dt className={lbl}>Created</dt>
            <dd className="text-slate-700">{fmtIso(theme.createdAt)}</dd>
          </div>
        </dl>
      </ResourcePanel>

      <ResourcePanel title="theme_config_json">
        <pre className="max-h-[28rem] overflow-auto p-3 text-[10px] leading-relaxed text-slate-800">
          {JSON.stringify(theme.themeConfigJson ?? {}, null, 2)}
        </pre>
      </ResourcePanel>
    </div>
  );
}

export function ThemeEditPage() {
  const { id } = useParams();
  const { themes, themesLoading, themesError, reloadThemes } = useThemes();
  const apiTheme = themes.find((t) => t.id === id);
  const uuid = isUuidParam(id);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabId = isTabId(tabParam) ? tabParam : 'basic';
  const [form, setForm] = useState<ThemeFormState>(() => getThemeFormState(id));

  useEffect(() => {
    setForm(getThemeFormState(id));
  }, [id]);

  function setTab(t: TabId) {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (t === 'basic') n.delete('tab');
        else n.set('tab', t);
        return n;
      },
      { replace: true },
    );
  }

  function toggleIndustry(i: string) {
    setForm((f) => {
      const s = new Set(f.industries);
      if (s.has(i)) s.delete(i);
      else s.add(i);
      return { ...f, industries: [...s] };
    });
  }

  if (themesError && uuid) {
    return (
      <div className="p-4 text-xs text-amber-900">
        {themesError}{' '}
        <button type="button" className="underline" onClick={() => void reloadThemes()}>
          Retry
        </button>
      </div>
    );
  }

  if (uuid && themesLoading && !apiTheme) {
    return <div className="p-4 text-xs text-slate-600">Loading theme…</div>;
  }

  if (uuid && !themesLoading && !apiTheme) {
    return (
      <div className="p-4 text-xs text-slate-700">
        Theme not found in catalog.{' '}
        <Link to="/themes/list" className="text-indigo-600 underline">
          Back to list
        </Link>
      </div>
    );
  }

  if (apiTheme) {
    return <CatalogThemeEditor theme={apiTheme} onSaved={reloadThemes} />;
  }

  return (
    <div>
      <PageHeader
        title={`Edit theme · ${form.name || id || ''}`}
        description="Legacy demo editor (non-API ids). Catalog themes use the read-only view above."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Link to="/themes/list" className={adminBtnSecondary}>
              ← All themes
            </Link>
            <Link to={`/themes/${id}/preview`} className={adminBtnSecondary}>
              Full preview
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
        <ResourcePanel title="Basic info & versioning">
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div>
              <label className={lbl}>Theme name</label>
              <input
                className={inp}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={lbl}>Version</label>
              <input
                className={inp}
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              />
            </div>
            <div>
              <label className={lbl}>Primary industry</label>
              <select
                className={inp}
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              >
                {THEME_INDUSTRY_OPTIONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Compatibility</label>
              <select
                className={inp}
                value={form.compatibility}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    compatibility: e.target.value as ThemeCompatibility,
                  }))
                }
              >
                <option value="both">Mobile app + Website</option>
                <option value="mobile_app">Mobile app only</option>
                <option value="website">Website only</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select
                className={inp}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as ThemeStatus }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive — tenants cannot select</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Preview image URL</label>
              <input
                className={inp}
                value={form.previewImage}
                onChange={(e) => setForm((f) => ({ ...f, previewImage: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Description</label>
              <textarea
                className={`${inp} min-h-[3rem]`}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Release notes</label>
              <textarea
                className={`${inp} min-h-[3rem]`}
                value={form.releaseNotes}
                onChange={(e) => setForm((f) => ({ ...f, releaseNotes: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Package path / replace bundle (demo)</label>
              <input type="file" accept=".zip" disabled className="text-xs" />
              <p className="mt-1 text-[10px] text-slate-500">{form.packageNote}</p>
            </div>
          </div>
        </ResourcePanel>
      ) : null}

      {tab === 'industry' ? (
        <ResourcePanel title="Industry mapping">
          <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600">
            Footwear → Modern Shoes, Minimal Store · Industrial → Industrial Pro, Factory Grid (examples).
          </p>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-auto">
            {THEME_INDUSTRY_OPTIONS.map((i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium text-slate-800">{i}</span>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={form.industries.includes(i)}
                    onChange={() => toggleIndustry(i)}
                    className="rounded border-slate-300"
                  />
                  Map theme
                </label>
              </li>
            ))}
          </ul>
        </ResourcePanel>
      ) : null}

      {tab === 'settings' ? (
        <ResourcePanel title="Customization defaults (theme config)">
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div>
              <label className={lbl}>Primary color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-8 w-12 cursor-pointer rounded border border-slate-200"
                  value={form.primaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                />
                <input
                  className={inp}
                  value={form.primaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className={lbl}>Secondary color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-8 w-12 cursor-pointer rounded border border-slate-200"
                  value={form.secondaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                />
                <input
                  className={inp}
                  value={form.secondaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className={lbl}>Font style</label>
              <input
                className={inp}
                value={form.fontStyle}
                onChange={(e) => setForm((f) => ({ ...f, fontStyle: e.target.value }))}
              />
            </div>
            <div>
              <label className={lbl}>Header layout</label>
              <select
                className={inp}
                value={form.headerLayout}
                onChange={(e) => setForm((f) => ({ ...f, headerLayout: e.target.value }))}
              >
                <option value="default">Default</option>
                <option value="sticky">Sticky</option>
                <option value="transparent">Transparent</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Footer layout</label>
              <select
                className={inp}
                value={form.footerLayout}
                onChange={(e) => setForm((f) => ({ ...f, footerLayout: e.target.value }))}
              >
                <option value="default">Default</option>
                <option value="compact">Compact</option>
                <option value="minimal">Minimal</option>
                <option value="expanded">Expanded</option>
              </select>
            </div>
          </div>
        </ResourcePanel>
      ) : null}
    </div>
  );
}
