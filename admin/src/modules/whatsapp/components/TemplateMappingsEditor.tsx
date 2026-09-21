import { useCallback, useEffect, useState } from 'react';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { ApiError } from '@/lib/apiClient';
import { getTemplateMappings, putTemplateMappings, type TemplateMappingRow } from '../api/whatsappApi';

const LOGICAL_KEYS = ['ORDER_CONFIRM', 'ORDER_DISPATCH', 'OTP', 'PAYMENT_REMINDER'] as const;

type Props = {
  tenantId: string;
};

export function TemplateMappingsEditor({ tenantId }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [activeByKey, setActiveByKey] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const rows: TemplateMappingRow[] = await getTemplateMappings(tenantId);
      const next: Record<string, string> = {};
      const act: Record<string, boolean> = {};
      for (const k of LOGICAL_KEYS) {
        next[k] = '';
        act[k] = true;
      }
      for (const r of rows) {
        if (LOGICAL_KEYS.includes(r.template_key as (typeof LOGICAL_KEYS)[number])) {
          next[r.template_key] = r.meta_template_name ?? '';
          act[r.template_key] = r.is_active;
        }
      }
      setValues(next);
      setActiveByKey(act);
    } catch (e) {
      setMsg({
        type: 'err',
        text: e instanceof ApiError ? e.message : 'Failed to load mappings',
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    try {
      const items = LOGICAL_KEYS.filter((k) => values[k]?.trim()).map((templateKey) => ({
        templateKey,
        metaTemplateName: values[templateKey]!.trim(),
        isActive: activeByKey[templateKey] !== false,
      }));
      await putTemplateMappings(tenantId, items);
      setMsg({ type: 'ok', text: 'Template mappings saved. Empty rows use platform default, then Meta name guess.' });
      await load();
    } catch (e) {
      setMsg({
        type: 'err',
        text: e instanceof ApiError ? e.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  }

  const lbl =
    'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
  const inp =
    'w-full max-w-md rounded-sm border border-slate-200 bg-white px-2 py-1.5 font-mono text-[11px] text-slate-900';

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-600">
        Map each <strong>logical key</strong> to the exact <strong>Meta template name</strong> synced for this tenant.
        Leave blank to use platform default, then lowercase key guess (see backend resolver).
      </p>
      {msg ? (
        <div
          className={
            msg.type === 'ok'
              ? 'rounded-sm border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900'
              : 'rounded-sm border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-900'
          }
        >
          {msg.text}
        </div>
      ) : null}
      {loading ? (
        <p className="text-xs text-slate-500">Loading mappings…</p>
      ) : (
        <>
          <div className="grid max-w-xl gap-3">
            {LOGICAL_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <label className={lbl} htmlFor={`map-${key}`}>
                  {key}
                </label>
                <input
                  id={`map-${key}`}
                  className={inp}
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder="Meta template name (optional)"
                  autoComplete="off"
                />
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={activeByKey[key] !== false}
                    onChange={(e) => setActiveByKey((a) => ({ ...a, [key]: e.target.checked }))}
                  />
                  Active (inactive rows are ignored by the sender; empty name removes override)
                </label>
              </div>
            ))}
          </div>
          <button type="button" className={adminBtnPrimary} disabled={saving} onClick={() => void onSave()}>
            {saving ? 'Saving…' : 'Save mappings'}
          </button>
        </>
      )}
    </div>
  );
}
