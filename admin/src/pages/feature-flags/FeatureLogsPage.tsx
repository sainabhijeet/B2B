import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useFeatureFlags } from '@/components/feature-flags/FeatureFlagsContext';
import type { FeatureLogRow } from '@/lib/featureFlagModels';

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function FeatureLogsPage() {
  const { logs } = useFeatureFlags();

  return (
    <ResourcePanel title="Feature logs">
      <DataTable
        columns={[
          { id: 'f', header: 'Feature', cell: (r: FeatureLogRow) => r.featureName },
          { id: 'a', header: 'Action', cell: (r: FeatureLogRow) => r.action },
          { id: 'u', header: 'User', cell: (r: FeatureLogRow) => r.user },
          { id: 't', header: 'Timestamp', cell: (r: FeatureLogRow) => fmt(r.timestamp) },
        ]}
        rows={logs}
        rowKey={(r) => r.id}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Emitted when flags, plan cells, or tenant overrides change.
      </p>
    </ResourcePanel>
  );
}
