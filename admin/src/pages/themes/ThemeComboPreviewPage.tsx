import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import {
  demoHostToUrl,
  fetchThemeComboPacks,
  readDemoHost,
  themesLoadErrorMessage,
  type ApiThemeComboPack,
} from '@/lib/themesApi';

export function ThemeComboPreviewPage() {
  const [packs, setPacks] = useState<ApiThemeComboPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchThemeComboPacks();
      setPacks(Array.isArray(list) ? list : []);
    } catch (e) {
      setPacks([]);
      setError(themesLoadErrorMessage(e));
      if (e instanceof ApiError && e.status === 403) {
        setError(`${themesLoadErrorMessage(e)} — themes combo API access required.`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <ResourcePanel
        title="Theme combo preview (cards)"
        toolbar={
          <button type="button" className={adminBtnSecondary} onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        }
      >
        <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600">
          Distributor-style view: each card is one row in <span className="font-mono">theme_combo_mapping</span> (web +
          mobile). Use <span className="font-mono">comboId</span> in <span className="font-mono">POST /themes/select</span>.
        </p>
        {error ? (
          <p className="px-3 py-2 text-xs text-amber-900">{error}</p>
        ) : null}
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((p) => {
            const img = p.previewImage ?? p.webTheme?.previewImage ?? p.mobileTheme?.previewImage;
            const webDemo = p.webTheme ? readDemoHost(p.webTheme.themeConfigJson) : null;
            const mobDemo = p.mobileTheme ? readDemoHost(p.mobileTheme.themeConfigJson) : null;
            return (
              <div
                key={p.id}
                className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <div className="aspect-video bg-slate-100">
                  {img ? (
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-slate-400">No preview</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3 text-xs">
                  <div className="font-semibold text-slate-900">{p.name}</div>
                  <div className="text-slate-600">
                    <div>
                      <span className="text-slate-500">Web:</span> {p.webTheme?.themeName ?? '—'}
                    </div>
                    <div>
                      <span className="text-slate-500">Mobile:</span> {p.mobileTheme?.themeName ?? '—'}
                    </div>
                  </div>
                  {p.status && p.status !== 'ACTIVE' ? (
                    <div className="text-[10px] font-medium text-amber-800">Status: {p.status}</div>
                  ) : null}
                  <code className="truncate text-[10px] text-slate-500" title={p.id}>
                    comboId: {p.id}
                  </code>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    <Link
                      to={`/themes/${p.webThemeId}/preview`}
                      className="rounded-sm border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-slate-50"
                    >
                      Web mock
                    </Link>
                    <Link
                      to={`/themes/${p.mobileThemeId}/preview`}
                      className="rounded-sm border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-slate-50"
                    >
                      Mobile mock
                    </Link>
                    {webDemo ? (
                      <a
                        href={demoHostToUrl(webDemo)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-sm border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-800"
                      >
                        Web live
                      </a>
                    ) : null}
                    {mobDemo ? (
                      <a
                        href={demoHostToUrl(mobDemo)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-sm border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-800"
                      >
                        Mobile live
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!loading && packs.length === 0 && !error ? (
          <p className="px-3 py-4 text-xs text-slate-500">No combo packs — create one under Combo packs.</p>
        ) : null}
      </ResourcePanel>
    </div>
  );
}
