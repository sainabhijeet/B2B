import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary } from '@/components/ui/buttonClasses';
import { useLanguageModule } from '@/components/language/LanguageModuleContext';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';
import type { TenantOverrideDemo } from '@/lib/languageModuleDemoData';

export function LanguageSettingsPage() {
  const { languages, setLanguages, settings, setSettings, tenantOverrides } = useLanguageModule();
  const active = languages.filter((l) => l.status === 'active');

  return (
    <div className="space-y-4">
      <ResourcePanel title="Global language settings">
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          <div>
            <label className={setLbl} htmlFor="set-def">
              Default language
            </label>
            <select
              id="set-def"
              className={setInp}
              value={settings.defaultLanguageCode}
              onChange={(e) => {
                const code = e.target.value;
                setSettings((s) => ({ ...s, defaultLanguageCode: code }));
                setLanguages((list) => list.map((l) => ({ ...l, isDefault: l.code === code })));
              }}
            >
              {active.map((l) => (
                <option key={l.id} value={l.code}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={setLbl} htmlFor="set-fb">
              Fallback language
            </label>
            <select
              id="set-fb"
              className={setInp}
              value={settings.fallbackLanguageCode}
              onChange={(e) => setSettings((s) => ({ ...s, fallbackLanguageCode: e.target.value }))}
            >
              {languages.map((l) => (
                <option key={l.id} value={l.code}>
                  {l.name} ({l.code}){l.status === 'disabled' ? ' — disabled' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="set-ad"
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300"
              checked={settings.autoDetectLanguage}
              onChange={(e) => setSettings((s) => ({ ...s, autoDetectLanguage: e.target.checked }))}
            />
            <label htmlFor="set-ad" className="text-xs text-slate-800">
              Auto-detect language (Accept-Language / browser hint)
            </label>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="set-tc"
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300"
              checked={settings.tenantLevelCustomization}
              onChange={(e) => setSettings((s) => ({ ...s, tenantLevelCustomization: e.target.checked }))}
            />
            <label htmlFor="set-tc" className="text-xs text-slate-800">
              Allow tenant-level translation overrides (distributor flow: select languages → review → save)
            </label>
          </div>
        </div>
        <div className="border-t border-slate-100 px-3 py-2">
          <button
            type="button"
            className={adminBtnPrimary}
            onClick={() => window.alert('Saved to this browser session (demo).')}
          >
            Save settings
          </button>
        </div>
      </ResourcePanel>

      <ResourcePanel title="Tenant overrides (example)">
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600">
          Changes like “Add to Cart” → “Buy now” are stored in <span className="font-mono">tenant_translations</span> and
          apply only to that tenant’s apps.
        </p>
        <DataTable
          columns={[
            { id: 't', header: 'Tenant', cell: (r: TenantOverrideDemo) => r.tenantName },
            { id: 'k', header: 'Key', cell: (r: TenantOverrideDemo) => <span className="font-mono text-xs">{r.key}</span> },
            { id: 'lc', header: 'Language', cell: (r: TenantOverrideDemo) => r.languageCode },
            { id: 'v', header: 'Value', cell: (r: TenantOverrideDemo) => r.value },
          ]}
          rows={tenantOverrides}
          rowKey={(r: TenantOverrideDemo) => r.id}
        />
      </ResourcePanel>

      <ResourcePanel title="Rendering on the frontend">
        <div className="p-3 text-[11px] leading-relaxed text-slate-700">
          <p>
            Resolve copy with a helper such as <span className="font-mono">t(&quot;add_to_cart&quot;)</span>, backed by a
            merged JSON object:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-sm border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] text-slate-800">{`{
  "add_to_cart": "Add to Cart",
  "checkout": "Checkout"
}`}</pre>
          <p className="mt-2 text-slate-600">
            Load platform defaults first, then overlay tenant overrides for the active locale.
          </p>
        </div>
      </ResourcePanel>
    </div>
  );
}
