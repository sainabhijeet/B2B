import { useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import {
  getThemeLocalizationHealth,
  type ThemeLocalizationHealth,
  type ThemeLocalizationHealthCandidate,
} from '@/lib/themeLocalizationHealthApi';

export function ThemeLocalizationDashboardPage() {
  const [health, setHealth] = useState<ThemeLocalizationHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setHealth(await getThemeLocalizationHealth());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load localization health.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const blockerRows = useMemo(() => Object.entries(health?.blockerCounts ?? {}).sort((a, b) => b[1] - a[1]), [health]);
  const missingRows = useMemo(() => Object.entries(health?.missingByLanguage ?? {}).sort((a, b) => b[1] - a[1]), [health]);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {error}{' '}
          <button type="button" className="font-medium underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Health" value={health?.status ?? '…'} loading={loading} tone={health?.status === 'healthy' ? 'emerald' : health?.status === 'critical' ? 'rose' : 'amber'} />
        <Metric label="Readiness" value={`${health?.metrics.readinessPercent ?? 0}%`} loading={loading} />
        <Metric label="Average coverage" value={`${health?.metrics.averageCompleteness ?? 0}%`} loading={loading} />
        <Metric label="Average parity" value={`${health?.metrics.averageParity ?? 0}%`} loading={loading} />
        <Metric label="Blocked releases" value={String(health?.totals.blocked ?? 0)} loading={loading} tone={(health?.totals.blocked ?? 0) > 0 ? 'rose' : 'emerald'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ResourcePanel title="Publish blockers">
          <div className="divide-y divide-slate-100 text-xs">
            {blockerRows.map(([code, count]) => (
              <div key={code} className="flex items-center justify-between px-3 py-2">
                <span className="font-mono text-slate-700">{code}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{count}</span>
              </div>
            ))}
            {!blockerRows.length ? <p className="p-3 text-slate-500">No localization blockers detected.</p> : null}
          </div>
        </ResourcePanel>

        <ResourcePanel title="Missing translations by language">
          <div className="grid grid-cols-2 gap-2 p-3 text-xs md:grid-cols-3">
            {missingRows.map(([language, count]) => (
              <div key={language} className="rounded border border-slate-100 p-2">
                <div className="font-mono text-[10px] uppercase text-slate-500">{language}</div>
                <div className={count > 0 ? 'mt-1 text-lg font-semibold text-rose-700' : 'mt-1 text-lg font-semibold text-emerald-700'}>{count}</div>
              </div>
            ))}
          </div>
        </ResourcePanel>
      </div>

      <ResourcePanel title="Release localization readiness">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Theme</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Coverage</th>
                <th className="px-3 py-2">Parity</th>
                <th className="px-3 py-2">Blockers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(health?.candidates ?? []).map((candidate) => (
                <CandidateRow key={candidate.candidateId} candidate={candidate} />
              ))}
              {!health?.candidates.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                    No release candidates have localization reports yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </ResourcePanel>
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: ThemeLocalizationHealthCandidate }) {
  return (
    <tr>
      <td className="px-3 py-2 font-medium text-slate-900">{candidate.familySlug}</td>
      <td className="px-3 py-2">{candidate.channel}</td>
      <td className="px-3 py-2 font-mono">{candidate.version}</td>
      <td className="px-3 py-2">{candidate.status}</td>
      <td className="px-3 py-2">{candidate.completeness}%</td>
      <td className="px-3 py-2">{candidate.parityPercent}%</td>
      <td className="px-3 py-2">
        {candidate.readyForPublish ? (
          <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">Ready</span>
        ) : (
          <span className="font-mono text-[10px] text-rose-700">{candidate.blockers.join(', ') || 'BLOCKED'}</span>
        )}
      </td>
    </tr>
  );
}

function Metric({
  label,
  value,
  loading,
  tone = 'slate',
}: {
  label: string;
  value: string;
  loading: boolean;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : tone === 'rose'
          ? 'text-rose-700'
          : 'text-slate-900';
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold capitalize tabular-nums ${toneClass}`}>{loading ? '…' : value}</div>
    </div>
  );
}
