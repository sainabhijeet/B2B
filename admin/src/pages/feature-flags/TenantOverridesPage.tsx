import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnDanger, adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useFeatureFlags } from '@/components/feature-flags/FeatureFlagsContext';
import type { TenantFeatureOverride } from '@/lib/featureFlagModels';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function TenantOverridesPage() {
  const { features, overrides, setOverrides, appendLog } = useFeatureFlags();
  const [open, setOpen] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [featureId, setFeatureId] = useState(features[0]?.featureId ?? '');
  const [enabled, setEnabled] = useState(true);
  const [note, setNote] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const name = tenantName.trim();
    const tid = tenantId.trim() || `tn-${Date.now()}`;
    if (!name) return;
    const fid = featureId || features[0]?.featureId;
    if (!fid) return;
    setOverrides((list) => [
      ...list,
      {
        id: `tfo-${Date.now()}`,
        tenantId: tid,
        tenantName: name,
        featureId: fid,
        enabled,
        note: note.trim(),
      },
    ]);
    const fn = features.find((f) => f.featureId === fid)?.featureName ?? fid;
    appendLog(fn, `Tenant override: ${name} → ${enabled ? 'on' : 'off'}`);
    setTenantName('');
    setTenantId('');
    setNote('');
    setOpen(false);
  }

  function remove(row: TenantFeatureOverride) {
    if (!window.confirm(`Remove override for ${row.tenantName}?`)) return;
    setOverrides((list) => list.filter((o) => o.id !== row.id));
    const fn = features.find((f) => f.featureId === row.featureId)?.featureName ?? row.featureId;
    appendLog(fn, `Tenant override removed: ${row.tenantName}`);
  }

  return (
    <ResourcePanel
      title="Tenant overrides"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={() => setOpen(true)}>
          Add override
        </button>
      }
    >
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <form onSubmit={onSubmit}>
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Tenant feature override</div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl}>Tenant name</label>
                  <input className={setInp} value={tenantName} onChange={(e) => setTenantName(e.target.value)} required />
                </div>
                <div>
                  <label className={setLbl}>Tenant ID (optional)</label>
                  <input className={setInp} value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="tn-…" />
                </div>
                <div>
                  <label className={setLbl}>Feature</label>
                  <select className={setInp} value={featureId} onChange={(e) => setFeatureId(e.target.value)}>
                    {features.map((f) => (
                      <option key={f.featureId} value={f.featureId}>
                        {f.featureName} ({f.module})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="ov-en"
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  <label htmlFor="ov-en" className="text-xs text-slate-800">
                    Override enabled (on for this tenant)
                  </label>
                </div>
                <div>
                  <label className={setLbl}>Note</label>
                  <input className={setInp} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Enterprise, beta…" />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={adminBtnPrimary}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={[
          { id: 'tn', header: 'Tenant', cell: (r: TenantFeatureOverride) => r.tenantName },
          {
            id: 'tid',
            header: 'Tenant ID',
            cell: (r: TenantFeatureOverride) => <span className="font-mono text-[10px]">{r.tenantId}</span>,
          },
          {
            id: 'f',
            header: 'Feature',
            cell: (r: TenantFeatureOverride) => features.find((f) => f.featureId === r.featureId)?.featureName ?? r.featureId,
          },
          {
            id: 'o',
            header: 'Override',
            cell: (r: TenantFeatureOverride) => (
              <span className={r.enabled ? 'text-emerald-700' : 'text-slate-500'}>
                {r.enabled ? 'Enabled' : 'Disabled'}
              </span>
            ),
          },
          { id: 'n', header: 'Note', cell: (r: TenantFeatureOverride) => r.note || '—' },
          {
            id: 'a',
            header: 'Actions',
            cell: (r: TenantFeatureOverride) => (
              <button type="button" className={adminBtnDanger} onClick={() => remove(r)}>
                Remove
              </button>
            ),
          },
        ]}
        rows={overrides}
        rowKey={(r) => r.id}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Stored in <span className="font-mono">tenant_feature_overrides</span>; evaluator: override → plan → master flag.
      </p>
    </ResourcePanel>
  );
}
