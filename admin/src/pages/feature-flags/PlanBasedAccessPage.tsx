import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { useFeatureFlags } from '@/components/feature-flags/FeatureFlagsContext';

export function PlanBasedAccessPage() {
  const { features, planMatrix, togglePlanCell } = useFeatureFlags();
  const sorted = [...features].sort((a, b) => a.featureName.localeCompare(b.featureName));
  const plans = [...new Set(Object.values(planMatrix).flatMap((row) => Object.keys(row)))].sort();

  return (
    <ResourcePanel title="Plan based access">
      <div className="overflow-x-auto border-t border-slate-100">
        <table className="admin-table w-full min-w-[36rem] border-collapse text-left text-xs">
          <thead>
            <tr>
              <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-600">Feature</th>
              <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-600">Module</th>
              {plans.map((planId) => (
                <th
                  key={planId}
                  className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center font-semibold capitalize text-slate-600"
                >
                  {planId}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => (
              <tr key={f.featureId} className="border-b border-slate-100">
                <th scope="row" className="px-3 py-2 text-left font-medium text-slate-900">
                  {f.featureName}
                </th>
                <td className="px-3 py-2 text-slate-600">{f.module}</td>
                {plans.map((planId) => {
                  const on = planMatrix[f.featureId]?.[planId] ?? false;
                  return (
                    <td key={planId} className="px-2 py-2 text-center">
                      <button
                        type="button"
                        className="h-7 w-7 rounded-sm border border-slate-200 bg-white text-sm hover:bg-slate-50"
                        onClick={() => togglePlanCell(f.featureId, planId)}
                        title={`Toggle ${f.featureName} for ${planId}`}
                      >
                        {on ? '✓' : '—'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-3 py-2 text-[10px] text-slate-500">
        Maps to <span className="font-mono">plan_features</span> (plan_id, feature_id, enabled). ✓ = entitlement for that
        plan.
      </p>
    </ResourcePanel>
  );
}
