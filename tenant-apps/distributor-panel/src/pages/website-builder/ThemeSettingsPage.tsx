import { useEffect, useState } from "react";
import {
  fetchTenantThemeTokens,
  formatWebsiteBuilderError,
  saveTenantThemeTokens,
} from "@/lib/websiteBuilderApi";

export function ThemeSettingsPage() {
  const [raw, setRaw] = useState<string>("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void fetchTenantThemeTokens()
      .then((tokens) => setRaw(JSON.stringify(tokens, null, 2)))
      .catch((e) => setError(formatWebsiteBuilderError(e, "Could not load theme token overrides.")))
      .finally(() => setLoading(false));
  }, []);

  async function onSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setError("Tokens must be a JSON object.");
        return;
      }
      const saved = await saveTenantThemeTokens(parsed as Record<string, unknown>);
      setRaw(JSON.stringify(saved, null, 2));
      setMessage("Theme settings saved.");
      window.dispatchEvent(new CustomEvent("website-builder:preview-refresh"));
    } catch (e) {
      if (e instanceof SyntaxError) setError("Invalid JSON.");
      else setError(formatWebsiteBuilderError(e, "Could not save theme settings."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Theme Tokens</h2>
      <p className="mt-1 text-xs text-slate-600">
        Example: {`{"colorPrimary":"#C9A227","fontPrimary":"Playfair Display","borderRadius":"12px"}`}
      </p>
      {loading ? <p className="mt-3 text-sm text-slate-600">Loading...</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={18}
        className="mt-3 w-full rounded-md border border-slate-300 p-3 font-mono text-xs"
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Theme Settings"}
        </button>
      </div>
    </div>
  );
}
