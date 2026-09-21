import { useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { useLanguageModule } from '@/components/language/LanguageModuleContext';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

type Row = {
  key: string;
  module: string;
  languageCode: string;
  languageName: string;
  value: string;
};

function ValueCell({ row }: { row: Row }) {
  const { setTranslationMap } = useLanguageModule();
  const [local, setLocal] = useState(row.value);
  useEffect(() => setLocal(row.value), [row.value, row.key, row.languageCode]);

  return (
    <input
      className={`${setInp} min-w-[12rem]`}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const v = local;
        setTranslationMap((m) => ({
          ...m,
          [row.key]: { ...(m[row.key] ?? {}), [row.languageCode]: v },
        }));
      }}
    />
  );
}

export function TranslationsEditorPage() {
  const { keys, languages, translationMap } = useLanguageModule();
  const [keyFilter, setKeyFilter] = useState('');
  const [langFilter, setLangFilter] = useState('');

  const activeLangs = useMemo(() => languages.filter((l) => l.status === 'active'), [languages]);

  const rows = useMemo((): Row[] => {
    const out: Row[] = [];
    const kf = keyFilter.trim().toLowerCase();
    for (const k of keys) {
      if (kf && !k.key.toLowerCase().includes(kf) && !k.module.toLowerCase().includes(kf)) continue;
      for (const l of activeLangs) {
        if (langFilter && l.code !== langFilter) continue;
        out.push({
          key: k.key,
          module: k.module,
          languageCode: l.code,
          languageName: l.name,
          value: translationMap[k.key]?.[l.code] ?? '',
        });
      }
    }
    return out;
  }, [keys, activeLangs, translationMap, keyFilter, langFilter]);

  return (
    <ResourcePanel title="Translations">
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-3">
        <div className="min-w-[10rem] flex-1">
          <label className={setLbl} htmlFor="tr-keyq">
            Filter by key / module
          </label>
          <input
            id="tr-keyq"
            className={setInp}
            value={keyFilter}
            onChange={(e) => setKeyFilter(e.target.value)}
            placeholder="add_to_cart"
          />
        </div>
        <div className="min-w-[8rem]">
          <label className={setLbl} htmlFor="tr-lang">
            Language
          </label>
          <select
            id="tr-lang"
            className={setInp}
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
          >
            <option value="">All active</option>
            {activeLangs.map((l) => (
              <option key={l.id} value={l.code}>
                {l.name} ({l.code})
              </option>
            ))}
          </select>
        </div>
      </div>
      <DataTable
        columns={[
          {
            id: 'key',
            header: 'Key',
            cell: (r: Row) => <span className="font-mono text-xs">{r.key}</span>,
          },
          { id: 'mod', header: 'Module', cell: (r: Row) => r.module },
          {
            id: 'lang',
            header: 'Language',
            cell: (r: Row) => (
              <span>
                {r.languageName} <span className="text-slate-500">({r.languageCode})</span>
              </span>
            ),
          },
          {
            id: 'val',
            header: 'Value',
            cell: (r: Row) => <ValueCell row={r} />,
          },
        ]}
        rows={rows}
        rowKey={(r: Row) => `${r.key}:${r.languageCode}`}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Values save when the field loses focus. Runtime bundles merge platform keys with{' '}
        <span className="font-mono">tenant_translations</span> overrides per storefront.
      </p>
    </ResourcePanel>
  );
}
