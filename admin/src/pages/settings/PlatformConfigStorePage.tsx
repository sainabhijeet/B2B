import { useCallback, useEffect, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { ApiError, apiGet, apiPost } from '@/lib/apiClient';
import { getApiOrigin } from '@/lib/apiBase';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

type ListResponse = {
  items: { key: string; value: string | null; createdAt: string; updatedAt: string }[];
  total: number;
  page: number;
  limit: number;
};

function previewValue(v: string | null, max = 72): string {
  if (v == null || v === '') return '—';
  const t = v.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function PlatformConfigStorePage() {
  const [prefix, setPrefix] = useState('');
  const [appliedPrefix, setAppliedPrefix] = useState('');
  const [page, setPage] = useState(1);
  const limit = 100;
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ key: string; value: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      if (appliedPrefix.trim()) q.set('prefix', appliedPrefix.trim());
      const res = await apiGet<ListResponse>(`/system-config?${q.toString()}`);
      setData(res);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load configuration';
      setError(`${msg} — API: ${getApiOrigin()}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, appliedPrefix]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  async function onSave() {
    if (!edit) return;
    setSaveError(null);
    setSaving(true);
    try {
      await apiPost('/system-config', { key: edit.key, value: edit.value });
      setEdit(null);
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Save failed';
      if (e instanceof ApiError && e.status === 403) {
        setSaveError('Only super admins can change keys (POST /system-config).');
      } else {
        setSaveError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResourcePanel title="Platform configuration (database)">
      <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-600">
        Keys stored in <code className="rounded bg-slate-100 px-1">system_config</code>. Filter
        by key prefix; super admins can edit values.
      </p>
      <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 px-3 py-2">
        <div className="min-w-[12rem] flex-1">
          <label className={setLbl}>Key prefix</label>
          <input
            className={setInp}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="e.g. catalog_media"
          />
        </div>
        <button
          type="button"
          className={adminBtnSecondary}
          onClick={() => {
            setPage(1);
            setAppliedPrefix(prefix);
          }}
        >
          Apply filter
        </button>
      </div>
      {error && (
        <div className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <th className="px-3 py-2 font-semibold">Key</th>
              <th className="px-3 py-2 font-semibold">Value</th>
              <th className="whitespace-nowrap px-3 py-2 font-semibold">Updated</th>
              <th className="px-3 py-2 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && data && data.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                  No rows match this filter. Clear prefix or seed the database.
                </td>
              </tr>
            )}
            {!loading &&
              data?.items.map((row) => (
                <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="max-w-[14rem] truncate px-3 py-2 font-mono text-[11px] text-slate-800">
                    {row.key}
                  </td>
                  <td className="max-w-[24rem] truncate px-3 py-2 text-slate-700" title={row.value ?? ''}>
                    {previewValue(row.value)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                    {new Date(row.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                      onClick={() =>
                        setEdit({ key: row.key, value: row.value ?? '' })
                      }
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {data && data.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[11px] text-slate-600">
          <span>
            {data.total} key{data.total === 1 ? '' : 's'} · page {data.page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              className={adminBtnSecondary}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className={adminBtnSecondary}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {edit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cfg-edit-title"
        >
          <div className="w-full max-w-lg rounded-sm border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-3 py-2">
              <h2 id="cfg-edit-title" className="text-sm font-semibold text-slate-900">
                Edit configuration
              </h2>
            </div>
            <div className="grid gap-2 p-3">
              <div>
                <label className={setLbl}>Key</label>
                <input className={setInp} readOnly value={edit.key} />
              </div>
              <div>
                <label className={setLbl}>Value</label>
                <textarea
                  className={`${setInp} min-h-[8rem] font-mono`}
                  value={edit.value}
                  onChange={(e) => setEdit({ ...edit, value: e.target.value })}
                />
              </div>
              {saveError && (
                <p className="text-xs text-red-600" role="alert">
                  {saveError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-3 py-2">
              <button
                type="button"
                className={adminBtnSecondary}
                disabled={saving}
                onClick={() => {
                  setEdit(null);
                  setSaveError(null);
                }}
              >
                Cancel
              </button>
              <button type="button" className={adminBtnPrimary} disabled={saving} onClick={() => void onSave()}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ResourcePanel>
  );
}
