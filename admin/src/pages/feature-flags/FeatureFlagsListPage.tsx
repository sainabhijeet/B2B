import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useFeatureFlags } from '@/components/feature-flags/FeatureFlagsContext';
import { TYPE_LABELS, type FeatureFlagType, type FeatureRow } from '@/lib/featureFlagModels';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function FeatureFlagsListPage() {
  const { features, setFeatureStatus, updateFeatureMeta } = useFeatureFlags();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureRow | null>(null);
  const [name, setName] = useState('');
  const [module, setModule] = useState('');
  const [type, setType] = useState<FeatureFlagType>('plan_based');

  function openEdit(row: FeatureRow) {
    setEditing(row);
    setName(row.featureName);
    setModule(row.module);
    setType(row.type);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    updateFeatureMeta(editing.featureId, {
      featureName: name.trim(),
      module: module.trim(),
      type,
    });
    close();
  }

  return (
    <ResourcePanel title="Feature flags">
      {open && editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={close}>
          <div
            className="w-full max-w-md rounded-sm border border-slate-200 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <form onSubmit={onSubmit}>
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Edit feature</div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl}>Feature name</label>
                  <input className={setInp} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <label className={setLbl}>Module</label>
                  <input className={setInp} value={module} onChange={(e) => setModule(e.target.value)} required />
                </div>
                <div>
                  <label className={setLbl}>Type</label>
                  <select
                    className={setInp}
                    value={type}
                    onChange={(e) => setType(e.target.value as FeatureFlagType)}
                  >
                    <option value="global">Global</option>
                    <option value="plan_based">Plan based</option>
                    <option value="tenant_specific">Tenant specific</option>
                    <option value="beta">Beta</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={close}>
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
          { id: 'n', header: 'Feature name', cell: (r: FeatureRow) => r.featureName },
          { id: 'm', header: 'Module', cell: (r: FeatureRow) => r.module },
          { id: 't', header: 'Type', cell: (r: FeatureRow) => TYPE_LABELS[r.type] },
          {
            id: 's',
            header: 'Status',
            cell: (r: FeatureRow) => (
              <span className={r.status === 'enabled' ? 'text-emerald-700' : 'text-slate-500'}>
                {r.status === 'enabled' ? 'Enabled' : 'Disabled'}
              </span>
            ),
          },
          { id: 'c', header: 'Created', cell: (r: FeatureRow) => r.createdAt },
          {
            id: 'a',
            header: 'Actions',
            cell: (r: FeatureRow) => (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className={adminBtnSecondary}
                  disabled={r.status === 'enabled'}
                  onClick={() => setFeatureStatus(r.featureId, 'enabled')}
                >
                  Enable
                </button>
                <button
                  type="button"
                  className={adminBtnSecondary}
                  disabled={r.status === 'disabled'}
                  onClick={() => setFeatureStatus(r.featureId, 'disabled')}
                >
                  Disable
                </button>
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
              </div>
            ),
          },
        ]}
        rows={features}
        rowKey={(r) => r.featureId}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Master status applies before plan matrix; tenant overrides can still force-on for entitled accounts.
      </p>
    </ResourcePanel>
  );
}
