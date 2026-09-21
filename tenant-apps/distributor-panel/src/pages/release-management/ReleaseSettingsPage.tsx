import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Save } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError } from "@/lib/apiClient";
import { fetchWhiteLabelStatus, type WhiteLabelStatusResponse } from "@/lib/distributorPanelApi";
import {
  fetchMobileReleaseSettings,
  saveMobileReleaseSettings,
  type MobileReleaseSettings,
  type ReleaseTrack,
} from "@/lib/mobileReleaseApi";

const tracks: { label: string; value: ReleaseTrack }[] = [
  { label: "Internal Testing", value: "internal" },
  { label: "Closed Testing", value: "alpha" },
  { label: "Open Testing", value: "beta" },
  { label: "Production", value: "production" },
];

export function ReleaseSettingsPage() {
  const [settings, setSettings] = useState<MobileReleaseSettings | null>(null);
  const [appStatus, setAppStatus] = useState<WhiteLabelStatusResponse | null>(null);
  const [googleSecret, setGoogleSecret] = useState("");
  const [appleKey, setAppleKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([fetchMobileReleaseSettings(), fetchWhiteLabelStatus()])
      .then(([nextSettings, nextStatus]) => {
        setSettings(nextSettings);
        setAppStatus(nextStatus);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load release settings."));
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    void saveMobileReleaseSettings({
      googlePackageName: settings.google.packageName,
      googleDefaultTrack: settings.google.defaultTrack,
      googleReleaseNotesTemplate: settings.google.releaseNotesTemplate,
      googleServiceAccountJson: googleSecret || undefined,
      appleBundleIdentifier: settings.apple.bundleIdentifier,
      appleIssuerId: settings.apple.issuerId,
      appleKeyId: settings.apple.keyId,
      appleApiKey: appleKey || undefined,
      appleTeamId: settings.apple.teamId,
    })
      .then((next) => {
        setSettings(next);
        setGoogleSecret("");
        setAppleKey("");
        setMessage("Release settings saved.");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not save release settings."))
      .finally(() => setSaving(false));
  };

  return (
    <div>
      <PageHeader title="Release Settings" description="Store deployment credentials and default mobile release options." />
      {error ? <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
      {!settings ? (
        <p className="text-sm text-slate-600">Loading release settings...</p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4 xl:grid-cols-2">
          <section className="xl:col-span-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <StatusItem label="App package" value={appStatus?.mobileApp.packageName || "-"} ok={!!appStatus?.mobileApp.packageName} />
              <StatusItem label="Google credentials" value={settings.google.hasServiceAccountJson ? "Stored" : "Missing"} ok={settings.google.hasServiceAccountJson} />
              <StatusItem label="App Store credentials" value={settings.apple.hasApiKey && settings.apple.issuerId && settings.apple.keyId ? "Stored" : "Missing"} ok={!!settings.apple.hasApiKey && !!settings.apple.issuerId && !!settings.apple.keyId} />
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-500" aria-hidden />
              <h2 className="font-semibold text-slate-900">Google Play</h2>
            </div>
            <div>
              <Field label="Package Name" value={settings.google.packageName} onChange={(v) => setSettings({ ...settings, google: { ...settings.google, packageName: v } })} />
              {appStatus?.mobileApp.packageName && settings.google.packageName !== appStatus.mobileApp.packageName ? (
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, google: { ...settings.google, packageName: appStatus.mobileApp.packageName } })}
                  className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
                >
                  Use app package: <span className="font-mono">{appStatus.mobileApp.packageName}</span>
                </button>
              ) : null}
            </div>
            <label className="mt-3 block text-sm">
              <span className="font-medium text-slate-700">Default Track</span>
              <select
                value={settings.google.defaultTrack}
                onChange={(e) => setSettings({ ...settings, google: { ...settings.google, defaultTrack: e.target.value as ReleaseTrack } })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {tracks.map((track) => <option key={track.value} value={track.value}>{track.label}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              <span className="font-medium text-slate-700">Service Account JSON</span>
              <textarea
                value={googleSecret}
                onChange={(e) => setGoogleSecret(e.target.value)}
                placeholder={settings.google.hasServiceAccountJson ? "Stored securely. Paste new JSON to replace." : "Paste service account JSON"}
                className="mt-1 h-28 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="font-medium text-slate-700">Release Notes Template</span>
              <textarea
                value={settings.google.releaseNotesTemplate}
                onChange={(e) => setSettings({ ...settings, google: { ...settings.google, releaseNotesTemplate: e.target.value } })}
                className="mt-1 h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-500" aria-hidden />
              <h2 className="font-semibold text-slate-900">App Store Connect</h2>
            </div>
            <Field label="Bundle Identifier" value={settings.apple.bundleIdentifier} onChange={(v) => setSettings({ ...settings, apple: { ...settings.apple, bundleIdentifier: v } })} />
            <Field label="Issuer ID" value={settings.apple.issuerId} onChange={(v) => setSettings({ ...settings, apple: { ...settings.apple, issuerId: v } })} />
            <Field label="Key ID" value={settings.apple.keyId} onChange={(v) => setSettings({ ...settings, apple: { ...settings.apple, keyId: v } })} />
            <Field label="Team ID" value={settings.apple.teamId} onChange={(v) => setSettings({ ...settings, apple: { ...settings.apple, teamId: v } })} />
            <label className="mt-3 block text-sm">
              <span className="font-medium text-slate-700">API Key</span>
              <textarea
                value={appleKey}
                onChange={(e) => setAppleKey(e.target.value)}
                placeholder={settings.apple.hasApiKey ? "Stored securely. Paste new key to replace." : "Paste .p8 API key"}
                className="mt-1 h-28 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </label>
          </section>
          <div className="xl:col-span-2">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              <Save className="h-4 w-4" aria-hidden />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function StatusItem({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className={["h-4 w-4", ok ? "text-emerald-600" : "text-slate-300"].join(" ")} aria-hidden />
        <span className="text-xs font-medium uppercase text-slate-500">{label}</span>
      </div>
      <div className="mt-1 break-all text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block text-sm first:mt-0">
      <span className="font-medium text-slate-700">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </label>
  );
}
