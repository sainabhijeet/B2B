import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { apiGet, apiPatch } from '@/lib/apiClient';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

type AiSettings = {
  colorPalettes: number;
  taglineSuggestions: number;
  logoGenerationLimit: number;
  maxLogoBatchesPerTenant: number;
};

export function AiBrandingSettingsPage() {
  const [row, setRow] = useState<AiSettings | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let c = false;
    void apiGet<AiSettings>('/admin/ai-settings')
      .then((d) => {
        if (!c) {
          setRow(d);
          setLoadErr(null);
        }
      })
      .catch((e) => {
        if (!c) setLoadErr(e instanceof Error ? e.message : 'Failed to load');
      });
    return () => {
      c = true;
    };
  }, []);

  async function onSave() {
    if (!row) return;
    setSaveErr(null);
    setSaving(true);
    try {
      const next = await apiPatch<AiSettings>('/admin/ai-settings', row);
      setRow(next);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="AI branding"
        description="Limits for distributor onboarding: color palettes, tagline options, logos per generation, and max logo batches per store."
      />
      {loadErr ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{loadErr}</p>
      ) : null}
      {saveErr ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{saveErr}</p>
      ) : null}
      {row ? (
        <div className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className={setLbl}>Color palettes per request (1–10)</label>
            <input
              type="number"
              min={1}
              max={10}
              className={setInp}
              value={row.colorPalettes}
              onChange={(e) => setRow({ ...row, colorPalettes: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={setLbl}>Tagline suggestions per request (1–10)</label>
            <input
              type="number"
              min={1}
              max={10}
              className={setInp}
              value={row.taglineSuggestions}
              onChange={(e) => setRow({ ...row, taglineSuggestions: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={setLbl}>Logos per generation (1–4)</label>
            <input
              type="number"
              min={1}
              max={4}
              className={setInp}
              value={row.logoGenerationLimit}
              onChange={(e) => setRow({ ...row, logoGenerationLimit: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={setLbl}>Max logo batches per tenant (1–50)</label>
            <input
              type="number"
              min={1}
              max={50}
              className={setInp}
              value={row.maxLogoBatchesPerTenant}
              onChange={(e) => setRow({ ...row, maxLogoBatchesPerTenant: Number(e.target.value) })}
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      ) : !loadErr ? (
        <p className="text-sm text-slate-600">Loading…</p>
      ) : null}
    </div>
  );
}
