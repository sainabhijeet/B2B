import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError } from "@/lib/apiClient";
import {
  fetchMetaTemplateOptions,
  fetchTemplateMappings,
  putTemplateMappings,
  type MetaTemplateOption,
  type TemplateMappingRow,
} from "@/lib/whatsappTemplateMappingApi";

const LOGICAL_KEYS = ["ORDER_CONFIRM", "ORDER_DISPATCH", "OTP", "PAYMENT_REMINDER"] as const;

function approvedUtilityOrAuth(t: MetaTemplateOption): boolean {
  if (t.status !== "APPROVED") return false;
  const c = (t.category ?? "").toUpperCase().trim();
  return c === "UTILITY" || c === "AUTHENTICATION";
}

export function WhatsappTemplateMappingPage() {
  const [metaRows, setMetaRows] = useState<MetaTemplateOption[]>([]);
  const [mappingRows, setMappingRows] = useState<TemplateMappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const dropdownOptions = useMemo(() => metaRows.filter(approvedUtilityOrAuth), [metaRows]);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [meta, maps] = await Promise.all([fetchMetaTemplateOptions(), fetchTemplateMappings()]);
      setMetaRows(meta);
      setMappingRows(maps);
    } catch (e) {
      setMsg({
        type: "err",
        text: e instanceof ApiError ? e.message : "Failed to load WhatsApp template data.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byKey = useMemo(() => new Map(mappingRows.map((r) => [r.template_key, r])), [mappingRows]);

  const [draftMeta, setDraftMeta] = useState<Record<string, string>>({});
  const [draftActive, setDraftActive] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const m: Record<string, string> = {};
    const a: Record<string, boolean> = {};
    for (const k of LOGICAL_KEYS) {
      const r = byKey.get(k);
      m[k] = r?.meta_template_name ?? "";
      a[k] = r?.is_active !== false;
    }
    setDraftMeta(m);
    setDraftActive(a);
  }, [byKey]);

  async function onSave() {
    setSaving(true);
    setMsg(null);
    try {
      const items: Array<{ template_key: string; meta_template_name?: string; is_active: boolean }> = [];
      for (const k of LOGICAL_KEYS) {
        const isActive = draftActive[k] !== false;
        const name = (draftMeta[k] ?? "").trim();
        if (isActive) {
          if (!name) {
            setMsg({ type: "err", text: `Select a Meta template for ${k} or turn Active off.` });
            setSaving(false);
            return;
          }
          items.push({ template_key: k, meta_template_name: name, is_active: true });
        } else {
          items.push({ template_key: k, is_active: false });
        }
      }
      const next = await putTemplateMappings(items);
      setMappingRows(next);
      setMsg({
        type: "ok",
        text: "Saved. Inactive keys skip tenant override; sender falls back to platform defaults then lowercase key.",
      });
    } catch (e) {
      setMsg({
        type: "err",
        text: e instanceof ApiError ? e.message : "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="WhatsApp template mapping"
        description="Map each logical event key to an APPROVED UTILITY or AUTHENTICATION template synced from Meta. Run template sync first if the list is empty."
      />
      {msg ? (
        <p
          className={
            msg.type === "ok" ? "mt-2 text-sm text-emerald-800" : "mt-2 text-sm text-red-600"
          }
        >
          {msg.text}
        </p>
      ) : null}
      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      ) : dropdownOptions.length === 0 ? (
        <p className="mt-4 max-w-xl text-sm text-amber-800">
          No approved UTILITY/AUTHENTICATION templates in the database. Use{" "}
          <code className="rounded bg-slate-100 px-1">POST /distributor/whatsapp/meta-templates/sync</code>{" "}
          (or your admin flow) to sync templates from Meta first.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-[520px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <th className="px-3 py-2">Template key</th>
                <th className="px-3 py-2">Meta template</th>
                <th className="px-3 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {LOGICAL_KEYS.map((k) => (
                <tr key={k} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs text-slate-800">{k}</td>
                  <td className="px-3 py-2">
                    <select
                      className="w-full max-w-xs rounded border border-slate-200 bg-white px-2 py-1.5 text-xs"
                      value={draftMeta[k] ?? ""}
                      onChange={(e) => setDraftMeta((d) => ({ ...d, [k]: e.target.value }))}
                    >
                      <option value="">— Select —</option>
                      {dropdownOptions.map((t) => (
                        <option key={t.id} value={t.templateName}>
                          {t.templateName} ({t.language})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={draftActive[k] !== false}
                      onChange={(e) => setDraftActive((d) => ({ ...d, [k]: e.target.checked }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-100 px-3 py-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSave()}
              className="rounded-sm bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save mappings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
