import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { TenantDetailLoadingGate } from '@/components/tenants/TenantDetailContext';
import { ApiError } from '@/lib/apiClient';
import {
  downloadBuildArtifact,
  fetchTenantBuilds,
  retryTenantBuild,
  type TenantBuildJob,
} from '@/lib/tenantBuildsApi';

function statusClass(status: TenantBuildJob['status']): string {
  if (status === 'SUCCESS') return 'text-emerald-700';
  if (status === 'FAILED') return 'text-red-600';
  if (status === 'RUNNING') return 'text-blue-700';
  return 'text-amber-700';
}

function TenantBuildRows({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<TenantBuildJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchTenantBuilds(tenantId);
      setRows(data);
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'Failed to load tenant builds.',
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasActiveBuild = useMemo(
    () =>
      rows.some((row) =>
        ['PENDING', 'QUEUED', 'RUNNING'].includes(row.status),
      ),
    [rows],
  );
  useEffect(() => {
    if (!hasActiveBuild) return;
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [hasActiveBuild, load]);

  const latest = rows[0];
  async function retry() {
    if (!latest) return;
    setBusy(true);
    setError(null);
    try {
      await retryTenantBuild(latest.id);
      await load();
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : 'Failed to trigger build.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResourcePanel
      title="Mobile and web builds"
      toolbar={
        <button
          type="button"
          className={adminBtnSecondary}
          disabled={!latest || busy || hasActiveBuild}
          onClick={() => void retry()}
          title={!latest ? 'No previous build configuration to retry.' : ''}
        >
          {busy ? 'Starting…' : 'Retry latest build'}
        </button>
      }
    >
      {error ? (
        <p className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="px-3 py-8 text-center text-xs text-slate-500">
          Loading builds…
        </p>
      ) : (
        <DataTable
          columns={[
            {
              id: 'app',
              header: 'App',
              cell: (row) => (
                <div>
                  <div className="font-medium">{row.appName}</div>
                  <code className="text-[10px] text-slate-500">
                    {row.packageName}
                  </code>
                </div>
              ),
            },
            { id: 'type', header: 'Type', cell: (row) => row.buildType },
            {
              id: 'created',
              header: 'Started',
              cell: (row) => new Date(row.createdAt).toLocaleString(),
            },
            {
              id: 'status',
              header: 'Status',
              cell: (row) => (
                <div>
                  <span className={statusClass(row.status)}>{row.status}</span>
                  {row.status === 'RUNNING' ? (
                    <span className="ml-1 text-xs text-slate-500">
                      {row.progress}%
                    </span>
                  ) : null}
                  {row.errorMessage ? (
                    <p
                      className="mt-1 max-w-80 truncate text-[10px] text-red-600"
                      title={row.errorMessage}
                    >
                      {row.errorMessage}
                    </p>
                  ) : null}
                </div>
              ),
            },
            {
              id: 'version',
              header: 'Version',
              cell: (row) =>
                row.artifacts[0]?.versionName ??
                row.artifacts[0]?.versionCode ??
                '—',
            },
            {
              id: 'artifacts',
              header: 'Downloads',
              className: 'text-right',
              cell: (row) =>
                row.artifacts.length ? (
                  <div className="flex justify-end gap-2">
                    {row.artifacts.map((artifact) => (
                      <button
                        key={artifact.id}
                        type="button"
                        className="text-xs font-medium text-indigo-600 hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void downloadBuildArtifact(artifact).catch((reason) =>
                            setError(
                              reason instanceof Error
                                ? reason.message
                                : 'Download failed.',
                            ),
                          );
                        }}
                      >
                        {artifact.artifactType}
                      </button>
                    ))}
                  </div>
                ) : (
                  '—'
                ),
            },
          ]}
          rows={rows}
          rowKey={(row) => row.id}
        />
      )}
    </ResourcePanel>
  );
}

export function TenantBuildsTab() {
  return (
    <TenantDetailLoadingGate>
      {(detail) => <TenantBuildRows tenantId={detail.id} />}
    </TenantDetailLoadingGate>
  );
}
