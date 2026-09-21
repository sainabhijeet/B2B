import { useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useNotificationTemplates } from '@/components/notifications/NotificationTemplatesContext';
import { CHANNEL_LABELS, renderEmailPreview, TEMPLATE_VARIABLES } from '@/lib/notificationTemplateModels';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';
import type { NotificationTemplateRow } from '@/lib/notificationTemplateModels';

function parseKeyValueLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function defaultsForTemplate(t: NotificationTemplateRow | undefined): string {
  if (!t) return '';
  const text = `${t.subject ?? ''} ${t.body}`;
  const keys = [...text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]!);
  const unique = [...new Set(keys)];
  const lines: string[] = [];
  for (const k of unique) {
    const def = TEMPLATE_VARIABLES.find((v) => v.token === `{{${k}}}`);
    lines.push(`${k}=${def?.example ?? ''}`);
  }
  return lines.join('\n');
}

export function NotificationPreviewPage() {
  const { templates } = useNotificationTemplates();
  const sorted = useMemo(() => [...templates].sort((a, b) => a.name.localeCompare(b.name)), [templates]);
  const [templateId, setTemplateId] = useState(sorted[0]?.templateId ?? '');
  const selected = templates.find((t) => t.templateId === templateId);
  const [varLines, setVarLines] = useState(() => defaultsForTemplate(sorted[0]));

  const syncVarsFromTemplate = (t: NotificationTemplateRow | undefined) => {
    setVarLines(defaultsForTemplate(t));
  };

  useEffect(() => {
    if (templates.length === 0) return;
    if (!templates.some((t) => t.templateId === templateId)) {
      const f = sorted[0];
      if (f) {
        setTemplateId(f.templateId);
        setVarLines(defaultsForTemplate(f));
      }
    }
  }, [templates, templateId, sorted]);

  return (
    <ResourcePanel title="Template preview">
      <div className="space-y-4 p-3">
        <div>
          <label className={setLbl} htmlFor="pv-tpl">
            Template
          </label>
          <select
            id="pv-tpl"
            className={setInp}
            value={templateId}
            onChange={(e) => {
              const id = e.target.value;
              setTemplateId(id);
              syncVarsFromTemplate(templates.find((t) => t.templateId === id));
            }}
          >
            {sorted.map((t) => (
              <option key={t.templateId} value={t.templateId}>
                {t.name} — {CHANNEL_LABELS[t.channel]} ({t.language})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={setLbl} htmlFor="pv-vars">
            Variables (one per line: <span className="font-mono">key=value</span>)
          </label>
          <textarea
            id="pv-vars"
            className={`${setInp} min-h-[8rem] font-mono text-[11px]`}
            value={varLines}
            onChange={(e) => setVarLines(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={adminBtnSecondary} onClick={() => syncVarsFromTemplate(selected)}>
            Reset sample values
          </button>
        </div>
        {selected ? (
          <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Output</p>
            {selected.channel === 'email' && selected.subject ? (
              <p className="mt-2 text-xs font-medium text-slate-900">
                Subject:{' '}
                {renderEmailPreview(selected.subject, selected.body, parseKeyValueLines(varLines)).subject}
              </p>
            ) : null}
            <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-slate-800">
              {renderEmailPreview(selected.subject, selected.body, parseKeyValueLines(varLines)).body}
            </pre>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No templates yet — create one under Templates.</p>
        )}
      </div>
    </ResourcePanel>
  );
}
