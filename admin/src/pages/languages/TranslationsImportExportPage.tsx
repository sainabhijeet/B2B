import { useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useLanguageModule } from '@/components/language/LanguageModuleContext';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function TranslationsImportExportPage() {
  const { importFromCsv, exportCsv, syncMissingFromDefault } = useLanguageModule();
  const [csvText, setCsvText] = useState('');
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  function onImport() {
    const { merged, errors } = importFromCsv(csvText);
    if (errors.length) {
      setLastMessage(errors.join(' '));
      return;
    }
    setLastMessage(`Imported ${merged} cell value(s). Keys are merged into the in-memory catalog.`);
  }

  function onExport() {
    const text = exportCsv();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-translations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLastMessage('Download started.');
  }

  function onSync() {
    const n = syncMissingFromDefault();
    setLastMessage(
      n ? `Filled ${n} empty locale cell(s) using the default language string as a starting point.` : 'Nothing to sync — all active locales already have copy or default language is empty.',
    );
  }

  return (
    <ResourcePanel title="Import / export">
      <div className="space-y-4 p-3">
        <div>
          <label className={setLbl} htmlFor="csv-in">
            Paste CSV (header: key,en,hi,fr,…)
          </label>
          <textarea
            id="csv-in"
            className={`${setInp} min-h-[10rem] font-mono text-[11px]`}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'key,en,hi,fr\nadd_to_cart,Add to Cart,कार्ट में जोड़ें,Ajouter au panier'}
            spellCheck={false}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={adminBtnPrimary} onClick={onImport}>
            Import CSV
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onExport}>
            Export CSV
          </button>
          <button type="button" className={adminBtnSecondary} onClick={onSync}>
            Sync translations
          </button>
        </div>
        {lastMessage ? (
          <p className="rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">{lastMessage}</p>
        ) : null}
        <p className="text-[10px] text-slate-500">
          <strong>Sync</strong> copies the default language string into empty cells for other active languages (you can
          refine afterward). Wire to your worker or CMS when moving beyond this panel.
        </p>
      </div>
    </ResourcePanel>
  );
}
