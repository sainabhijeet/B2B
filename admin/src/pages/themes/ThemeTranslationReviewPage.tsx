import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { getTranslationJob, listTranslationJobs, publishTranslationJob, reviewTranslation, type TranslationEntry, type TranslationJobDetail } from '@/lib/translationPipelineApi';

export function ThemeTranslationReviewPage() {
  const { id: routeJobId } = useParams();
  const [jobs, setJobs] = useState<TranslationJobDetail['job'][]>([]);
  const [jobId, setJobId] = useState(routeJobId ?? '');
  const [detail, setDetail] = useState<TranslationJobDetail | null>(null);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadJobs() {
    const response = await listTranslationJobs();
    setJobs(response.data ?? []);
    if (!jobId && response.data?.[0]) setJobId(response.data[0].id);
  }
  async function loadDetail(selected = jobId) {
    if (!selected) return;
    const response = await getTranslationJob(selected);
    setDetail(response.data);
  }
  useEffect(() => { void loadJobs().catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load translation jobs.')); }, []);
  useEffect(() => { void loadDetail().catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load translation job.')); }, [jobId]);

  const entries = useMemo(() => (detail?.entries ?? []).filter((entry) => !filter || `${entry.translationKey} ${entry.sourceText}`.toLowerCase().includes(filter.toLowerCase())), [detail, filter]);
  async function review(entry: TranslationEntry, decision: 'APPROVED' | 'REJECTED') {
    const value = (document.getElementById(`translation-${entry.id}`) as HTMLTextAreaElement | null)?.value ?? entry.draftText ?? '';
    if (!value.trim()) return;
    setBusy(true); setMessage(null);
    try { await reviewTranslation(entry.id, value, decision); await loadDetail(); setMessage(decision === 'APPROVED' ? 'Translation approved.' : 'Translation rejected.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Review failed.'); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!jobId) return;
    setBusy(true); setMessage(null);
    try { await publishTranslationJob(jobId); await loadDetail(); setMessage('Translation job published.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Publish failed.'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <ResourcePanel title="Theme translation pipeline">
      <div className="flex flex-wrap items-end gap-3 p-3">
        <label className="min-w-[18rem] flex-1 text-xs font-semibold text-slate-600">Translation job
          <select className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm" value={jobId} onChange={(event) => setJobId(event.target.value)}>
            <option value="">Select a job</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.themeId} · {job.status} · {job.sourceLanguage} → {job.targetLanguages.join(', ')}</option>)}
          </select>
        </label>
        <input className="rounded border border-slate-300 px-2 py-2 text-sm" placeholder="Filter keys or source text" value={filter} onChange={(event) => setFilter(event.target.value)} />
        <button type="button" className={adminBtnSecondary} onClick={() => void loadDetail()}>Refresh</button>
        <button type="button" className={adminBtnPrimary} disabled={busy || !detail?.coverage.readyForPublish} onClick={() => void publish()}>Approve & publish</button>
      </div>
      {detail ? <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 text-xs md:grid-cols-4"><Metric label="Status" value={detail.job.status} /><Metric label="Coverage" value={`${detail.coverage.completeness}%`} /><Metric label="Approved" value={`${detail.coverage.approved}/${detail.coverage.total}`} /><Metric label="Missing" value={String(detail.coverage.missing)} /></div> : null}
    </ResourcePanel>
    <ResourcePanel title="Human review and translation diff">
      <div className="divide-y divide-slate-100">{entries.map((entry) => <ReviewRow key={entry.id} entry={entry} busy={busy} onReview={review} />)}{!entries.length ? <p className="p-4 text-sm text-slate-500">Select a job with translation entries.</p> : null}</div>
    </ResourcePanel>
    {message ? <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{message}</p> : null}
  </div>;
}

function ReviewRow({ entry, busy, onReview }: { entry: TranslationEntry; busy: boolean; onReview: (entry: TranslationEntry, decision: 'APPROVED' | 'REJECTED') => Promise<void> }) {
  return <article className="grid gap-3 p-4 lg:grid-cols-2"><div><div className="mb-1 font-mono text-xs text-slate-500">{entry.languageCode} · {entry.translationKey}</div><div className="rounded bg-slate-50 p-3 text-sm text-slate-800">{entry.sourceText}</div></div><div><textarea id={`translation-${entry.id}`} className="min-h-24 w-full rounded border border-slate-300 p-3 text-sm" defaultValue={entry.approvedText ?? entry.draftText ?? ''} /><div className="mt-2 flex items-center justify-between"><span className="text-xs text-slate-500">{entry.status} · draft v{entry.draftVersion}</span><span className="flex gap-2"><button type="button" className={adminBtnSecondary} disabled={busy} onClick={() => void onReview(entry, 'REJECTED')}>Reject</button><button type="button" className={adminBtnPrimary} disabled={busy} onClick={() => void onReview(entry, 'APPROVED')}>Approve</button></span></div></div></article>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded border border-slate-200 p-2"><div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 font-semibold text-slate-900">{value}</div></div>; }
