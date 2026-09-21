import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { useFeatureFlags } from '@/components/feature-flags/FeatureFlagsContext';

export function FeatureGroupsPage() {
  const { features } = useFeatureFlags();
  const groups = [...new Set(features.map((feature) => feature.module || 'Unassigned'))].sort();

  return (
    <ResourcePanel title="Feature groups">
      <div className="space-y-4 p-3">
        {groups.map((group) => {
          const groupFeatures = features.filter((feature) => (feature.module || 'Unassigned') === group);
          return (
            <div key={group} className="rounded-sm border border-slate-200 bg-slate-50/80 p-3">
              <div className="text-sm font-semibold text-slate-900">{group}</div>
              {groupFeatures.length ? (
                <ul className="mt-2 space-y-1 border-l-2 border-indigo-200 pl-3 text-sm text-slate-700">
                  {groupFeatures.map((feature) => (
                    <li key={feature.featureId}>
                      <span className="text-indigo-700">-</span> {feature.featureName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No features assigned.</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Groups are a navigation / policy shorthand; enforcement still uses feature_id + plan + overrides.
      </p>
    </ResourcePanel>
  );
}
