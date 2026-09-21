import { useEffect, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError } from "@/lib/apiClient";
import {
  downloadMobileAppBuildArtifact,
  fetchWhiteLabelStatus,
  type MobileBuildHistoryRow,
} from "@/lib/distributorPanelApi";
import { fetchMobileReleases, rollbackMobileRelease, type MobileRelease } from "@/lib/mobileReleaseApi";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

function formatElapsed(value: string | null): string | null {
  if (!value) return null;
  const started = new Date(value).getTime();
  if (Number.isNaN(started)) return null;
  const elapsedMs = Math.max(0, Date.now() - started);
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 1) return "less than 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function buildStatusLabel(row: MobileBuildHistoryRow): string {
  if (row.status !== "RUNNING" && row.status !== "QUEUED") return row.status;
  const elapsed = formatElapsed(row.date);
  return elapsed ? `${row.status} (${elapsed})` : row.status;
}

function statusClass(status: string): string {
  if (status === "SUCCESS" || status === "PUBLISHED" || status === "UPLOADED") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
  if (status === "RUNNING" || status === "QUEUED" || status === "PROCESSING") {
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  }
  if (status === "FAILED") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

export function ReleaseHistoryPage() {
  const [rows, setRows] = useState<MobileRelease[]>([]);
  const [buildRows, setBuildRows] = useState<MobileBuildHistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [downloadId, setDownloadId] = useState<string | null>(null);

  const load = () =>
    Promise.allSettled([fetchMobileReleases(), fetchWhiteLabelStatus()])
      .then(([releaseResult, statusResult]) => {
        if (releaseResult.status === "fulfilled") {
          setRows(releaseResult.value);
        } else {
          setRows([]);
        }
        if (statusResult.status === "fulfilled") {
          setBuildRows(statusResult.value.mobileApp.buildHistory ?? []);
        } else {
          setBuildRows([]);
        }
        if (releaseResult.status === "rejected" && statusResult.status === "rejected") {
          const reason = releaseResult.reason;
          setError(reason instanceof ApiError ? reason.message : "Could not load release history.");
        } else {
          setError(null);
        }
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load release history."));

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!buildRows.some((row) => row.status === "RUNNING" || row.status === "QUEUED")) return;
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
  }, [buildRows]);

  return (
    <div>
      <PageHeader title="Release History" description="Track app builds and Google Play/App Store release activity." />
      {error ? <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      <section className="mb-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Build history</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium uppercase">Version</th>
                <th className="px-3 py-2 font-medium uppercase">Build</th>
                <th className="px-3 py-2 font-medium uppercase">Platform</th>
                <th className="px-3 py-2 font-medium uppercase">Artifact</th>
                <th className="px-3 py-2 font-medium uppercase">Date</th>
                <th className="px-3 py-2 font-medium uppercase">Status</th>
                <th className="px-3 py-2 font-medium uppercase">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {buildRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-medium text-slate-900">{row.version}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-700">{row.buildNumber}</td>
                  <td className="px-3 py-2 text-slate-700">{row.platform}</td>
                  <td className="px-3 py-2 text-slate-700">{row.artifactType ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(row.date)}</td>
                  <td
                    className="px-3 py-2 text-slate-700"
                    title={
                      row.status === "RUNNING" || row.status === "QUEUED"
                        ? "Android builds usually finish in a few minutes. Local fallback can wait up to about 20 minutes; stale jobs are treated as failed by the backend timeout."
                        : undefined
                    }
                  >
                    <span className={["rounded-full px-2 py-1 font-medium", statusClass(row.status)].join(" ")}>
                      {buildStatusLabel(row)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {row.downloadUrl ? (
                      <button
                        type="button"
                        disabled={downloadId === row.id}
                        onClick={() => {
                          setDownloadId(row.id);
                          setError(null);
                          void downloadMobileAppBuildArtifact(row.downloadUrl!)
                            .catch((e) => setError(e instanceof Error ? e.message : "Could not download build artifact."))
                            .finally(() => setDownloadId(null));
                        }}
                        className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden />
                        {downloadId === row.id ? "Preparing..." : "Download"}
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {!buildRows.length ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={7}>No app builds yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Store release uploads</h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium uppercase">Platform</th>
              <th className="px-3 py-2 font-medium uppercase">Version</th>
              <th className="px-3 py-2 font-medium uppercase">Package</th>
              <th className="px-3 py-2 font-medium uppercase">Track</th>
              <th className="px-3 py-2 font-medium uppercase">Status</th>
              <th className="px-3 py-2 font-medium uppercase">Uploaded</th>
              <th className="px-3 py-2 font-medium uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-2 font-medium text-slate-900">{row.platform === "GOOGLE_PLAY" ? "Google Play" : "App Store"}</td>
                <td className="px-3 py-2 tabular-nums text-slate-700">{row.versionName}+{row.buildNumber}</td>
                <td className="max-w-[220px] break-all px-3 py-2 font-mono text-slate-700">{row.packageName}</td>
                <td className="px-3 py-2 text-slate-700">{row.releaseTrack || "-"}</td>
                <td className="px-3 py-2">
                  <span className={["rounded-full px-2 py-1 font-medium", statusClass(row.status)].join(" ")}>{row.status}</span>
                </td>
                <td className="px-3 py-2 text-slate-600">{formatDate(row.uploadDate || row.createdAt)}</td>
                <td className="px-3 py-2">
                  {["PUBLISHED", "UPLOADED", "PROCESSING"].includes(row.status) ? (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => {
                        setBusyId(row.id);
                        setError(null);
                        void rollbackMobileRelease(row.id)
                          .then(() => load())
                          .catch((e) => setError(e instanceof ApiError ? e.message : "Rollback failed."))
                          .finally(() => setBusyId(null));
                      }}
                      className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      {busyId === row.id ? "Rolling..." : "Rollback"}
                    </button>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-slate-500" colSpan={7}>
                  No store uploads yet. Complete Release Settings, then upload the latest AAB to Google Play.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
