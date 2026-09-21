import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useThemes } from '@/components/themes/ThemesContext';
import { DataTable } from '@/components/ui/DataTable';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import {
  createThemeComboPack,
  fetchThemeComboPacks,
  themesLoadErrorMessage,
  type ApiThemeComboPack,
} from '@/lib/themesApi';

const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inputClass =
  'w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export function ThemeComboPacksPage() {
  const {
    themes,
    themesLoading,
    themesError,
    reloadThemes,
  } = useThemes();
  const webThemes = useMemo(
    () => themes.filter((theme) => (theme.themeChannel ?? 'WEB') === 'WEB' && theme.status === 'ACTIVE'),
    [themes],
  );
  const mobileThemes = useMemo(
    () => themes.filter((theme) => theme.themeChannel === 'MOBILE' && theme.status === 'ACTIVE'),
    [themes],
  );

  const [rows, setRows] = useState<ApiThemeComboPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [comboName, setComboName] = useState('');
  const [webId, setWebId] = useState('');
  const [mobileId, setMobileId] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchThemeComboPacks();
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      setError(themesLoadErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setMessage(null);
    setCreateError(null);
    setComboName('');
    setWebId(webThemes[0]?.id ?? '');
    setMobileId(mobileThemes[0]?.id ?? '');
    setShowCreate(true);
  }

  async function createCombo(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!comboName.trim() || !webId || !mobileId) {
      setCreateError('Enter a name and select both a web and mobile theme.');
      return;
    }
    setCreateBusy(true);
    try {
      const created = await createThemeComboPack({
        name: comboName.trim(),
        webThemeId: webId,
        mobileThemeId: mobileId,
        status: 'ACTIVE',
      });
      setShowCreate(false);
      setMessage(`${created.name} was created and is ready for distributor selection.`);
      await load();
    } catch (e) {
      setCreateError(themesLoadErrorMessage(e));
    } finally {
      setCreateBusy(false);
    }
  }

  const serviceError = themesError || error;
  const canCreate = webThemes.length > 0 && mobileThemes.length > 0;

  return (
    <div className="space-y-4">
      {serviceError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <div>
            <p className="text-xs font-semibold text-red-900">Theme service is temporarily unavailable</p>
            <p className="mt-0.5 text-[11px] text-red-700">{serviceError}</p>
          </div>
          <button
            type="button"
            className={adminBtnSecondary}
            onClick={() => void Promise.all([reloadThemes(), load()])}
          >
            Try again
          </button>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Web themes" value={webThemes.length} loading={themesLoading} />
        <Metric label="Mobile themes" value={mobileThemes.length} loading={themesLoading} />
        <Metric label="Active combo packs" value={rows.filter((row) => (row.status ?? 'ACTIVE') === 'ACTIVE').length} loading={loading} />
      </div>

      <ResourcePanel
        title="Web + mobile combo packs"
        toolbar={
          <div className="flex gap-1.5">
            <button type="button" className={adminBtnSecondary} onClick={() => void load()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" className={adminBtnPrimary} onClick={openCreate} disabled={!canCreate || themesLoading}>
              Create combo pack
            </button>
          </div>
        }
      >
        <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600">
          Pair one published web theme with one published mobile theme. Distributors can apply both channels in a single action.
        </p>

        {!canCreate && !themesLoading && !serviceError ? (
          <div className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Publish at least one active web theme and one active mobile theme before creating a combo.
          </div>
        ) : null}

        {showCreate ? (
          <div className="border-b border-indigo-100 bg-gradient-to-br from-slate-50 to-indigo-50/50 p-4">
            <form onSubmit={(e) => void createCombo(e)} className="mx-auto max-w-2xl">
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-900">Create combo pack</p>
                <p className="mt-1 text-xs text-slate-500">Choose the storefront and mobile experiences that belong together.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Combo name</label>
                  <input className={inputClass} value={comboName} onChange={(e) => setComboName(e.target.value)} placeholder="Example: Modern Commerce Suite" autoFocus required />
                </div>
                <div>
                  <label className={labelClass}>Web storefront</label>
                  <select className={inputClass} value={webId} onChange={(e) => setWebId(e.target.value)} required>
                    {webThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>{theme.themeName} · {theme.slug ?? 'web'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Mobile experience</label>
                  <select className={inputClass} value={mobileId} onChange={(e) => setMobileId(e.target.value)} required>
                    {mobileThemes.map((theme) => (
                      <option key={theme.id} value={theme.id}>{theme.themeName} · {theme.slug ?? 'mobile'}</option>
                    ))}
                  </select>
                </div>
              </div>
              {createError ? (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{createError}</div>
              ) : null}
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className={adminBtnSecondary} disabled={createBusy} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className={adminBtnPrimary} disabled={createBusy}>{createBusy ? 'Creating…' : 'Create combo'}</button>
              </div>
            </form>
          </div>
        ) : null}

        <DataTable
          columns={[
            {
              id: 'name',
              header: 'Combo pack',
              cell: (row) => (
                <div>
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <code className="text-[10px] text-slate-400">{row.id.slice(0, 8)}…</code>
                </div>
              ),
            },
            {
              id: 'web',
              header: 'Web theme',
              cell: (row) => <ThemeCell theme={row.webTheme} fallbackId={row.webThemeId} />,
            },
            {
              id: 'mobile',
              header: 'Mobile theme',
              cell: (row) => <ThemeCell theme={row.mobileTheme} fallbackId={row.mobileThemeId} />,
            },
            {
              id: 'status',
              header: 'Status',
              cell: (row) => (
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${(row.status ?? 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {row.status ?? 'ACTIVE'}
                </span>
              ),
            },
            {
              id: 'created',
              header: 'Created',
              cell: (row) => <span className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>,
            },
            {
              id: 'actions',
              header: 'Open',
              cell: (row) => (
                <div className="flex gap-2 text-xs">
                  <Link className="font-medium text-indigo-600 hover:underline" to={`/themes/${row.webThemeId}/edit`}>Web</Link>
                  <Link className="font-medium text-indigo-600 hover:underline" to={`/themes/${row.mobileThemeId}/edit`}>Mobile</Link>
                </div>
              ),
            },
          ]}
          rows={rows}
          rowKey={(row) => row.id}
        />

        {!loading && rows.length === 0 && !serviceError ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <div className="rounded-full bg-indigo-50 p-3"><span className="block h-5 w-5 rounded bg-indigo-500" /></div>
            <p className="mt-3 text-sm font-semibold text-slate-900">No combo packs yet</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">Create your first pack to let distributors apply a matching web and mobile experience together.</p>
            {canCreate ? <button type="button" className={`${adminBtnPrimary} mt-4`} onClick={openCreate}>Create first combo</button> : null}
          </div>
        ) : null}
      </ResourcePanel>
    </div>
  );
}

function Metric({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{loading ? '…' : value}</p>
    </div>
  );
}

function ThemeCell({
  theme,
  fallbackId,
}: {
  theme?: ApiThemeComboPack['webTheme'];
  fallbackId: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-800">{theme?.themeName ?? 'Theme'}</p>
      <code className="text-[10px] text-slate-400">{theme?.slug ?? `${fallbackId.slice(0, 8)}…`}</code>
    </div>
  );
}
