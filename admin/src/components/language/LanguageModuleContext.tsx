import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  INITIAL_LANGUAGES,
  INITIAL_LANGUAGE_SETTINGS,
  INITIAL_TENANT_OVERRIDES,
  INITIAL_TRANSLATION_KEYS,
  INITIAL_TRANSLATION_MAP,
  cloneTranslationMap,
  type LanguageRow,
  type LanguageSettings,
  type TenantOverrideDemo,
  type TranslationKeyRow,
  type TranslationMap,
} from '@/lib/languageModuleDemoData';
import { fetchPlatformLanguages, savePlatformLanguages } from '@/lib/platformLanguagesApi';

type LanguageModuleValue = {
  languages: LanguageRow[];
  setLanguages: Dispatch<SetStateAction<LanguageRow[]>>;
  keys: TranslationKeyRow[];
  setKeys: Dispatch<SetStateAction<TranslationKeyRow[]>>;
  translationMap: TranslationMap;
  setTranslationMap: Dispatch<SetStateAction<TranslationMap>>;
  settings: LanguageSettings;
  setSettings: Dispatch<SetStateAction<LanguageSettings>>;
  tenantOverrides: TenantOverrideDemo[];
  setTenantOverrides: Dispatch<SetStateAction<TenantOverrideDemo[]>>;
  activeLanguageCodes: string[];
  importFromCsv: (csvText: string) => { merged: number; errors: string[] };
  exportCsv: () => string;
  syncMissingFromDefault: () => number;
};

const LanguageModuleContext = createContext<LanguageModuleValue | null>(null);

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQuote = !inQuote;
    } else if ((c === ',' && !inQuote) || c === '\r') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

export function LanguageModuleProvider({ children }: { children: ReactNode }) {
  const [languages, setLanguages] = useState<LanguageRow[]>(() =>
    INITIAL_LANGUAGES.map((l) => ({ ...l })),
  );
  const [keys, setKeys] = useState<TranslationKeyRow[]>(() =>
    INITIAL_TRANSLATION_KEYS.map((k) => ({ ...k })),
  );
  const [translationMap, setTranslationMap] = useState<TranslationMap>(() =>
    cloneTranslationMap(INITIAL_TRANSLATION_MAP),
  );
  const [settings, setSettings] = useState<LanguageSettings>(() => ({ ...INITIAL_LANGUAGE_SETTINGS }));
  const [tenantOverrides, setTenantOverrides] = useState<TenantOverrideDemo[]>(() =>
    INITIAL_TENANT_OVERRIDES.map((t) => ({ ...t })),
  );
  const loadedLanguagesRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void fetchPlatformLanguages()
      .then((rows) => {
        if (cancelled || !rows.length) return;
        setLanguages(rows.map((row) => ({ ...row })));
      })
      .catch(() => {
        /* keep bundled defaults when the backend is unavailable */
      })
      .finally(() => {
        if (!cancelled) loadedLanguagesRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loadedLanguagesRef.current) return;
    const timer = window.setTimeout(() => {
      void savePlatformLanguages(languages).catch(() => {
        /* keep UI responsive; the next change/reload will try again */
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [languages]);

  const activeLanguageCodes = useMemo(
    () =>
      languages.filter((l) => l.status === 'active').map((l) => l.code),
    [languages],
  );

  const importFromCsv = useCallback(
    (csvText: string): { merged: number; errors: string[] } => {
      const errors: string[] = [];
      const lines = csvText.split(/\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        errors.push('Need a header row and at least one data row.');
        return { merged: 0, errors };
      }
      const header = parseCsvLine(lines[0]!);
      if (!header.length || header[0]!.toLowerCase() !== 'key') {
        errors.push('First column must be "key".');
        return { merged: 0, errors };
      }
      const langCols = header.slice(1).map((h) => h.trim().toLowerCase());
      let merged = 0;
      setTranslationMap((prev) => {
        const next = cloneTranslationMap(prev);
        for (let i = 1; i < lines.length; i++) {
          const cells = parseCsvLine(lines[i]!);
          const key = cells[0]?.trim();
          if (!key) continue;
          if (!next[key]) next[key] = {};
          for (let j = 0; j < langCols.length; j++) {
            const lang = langCols[j]!;
            const val = cells[j + 1] ?? '';
            if (lang && val !== '') {
              next[key]![lang] = val;
              merged++;
            }
          }
        }
        return next;
      });
      return { merged, errors };
    },
    [],
  );

  const exportCsv = useCallback((): string => {
    const codes = languages.filter((l) => l.status === 'active').map((l) => l.code);
    const header = ['key', ...codes].join(',');
    const keySet = new Set(keys.map((k) => k.key));
    for (const k of Object.keys(translationMap)) keySet.add(k);
    const rows = [...keySet].sort().map((key) => {
      const cells = [key, ...codes.map((c) => {
        const v = translationMap[key]?.[c] ?? '';
        const esc = v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
        return esc;
      })];
      return cells.join(',');
    });
    return [header, ...rows].join('\n');
  }, [languages, keys, translationMap]);

  const syncMissingFromDefault = useCallback((): number => {
    let filled = 0;
    const def = settings.defaultLanguageCode;
    const codes = languages.filter((l) => l.status === 'active').map((l) => l.code);
    setTranslationMap((prev) => {
      const next = cloneTranslationMap(prev);
      for (const row of keys) {
        const k = row.key;
        if (!next[k]) next[k] = {};
        const base = next[k]![def] ?? '';
        if (!base) continue;
        for (const code of codes) {
          if (code === def) continue;
          if (!next[k]![code]) {
            next[k]![code] = base;
            filled++;
          }
        }
      }
      return next;
    });
    return filled;
  }, [keys, settings.defaultLanguageCode, languages]);

  const value = useMemo(
    () => ({
      languages,
      setLanguages,
      keys,
      setKeys,
      translationMap,
      setTranslationMap,
      settings,
      setSettings,
      tenantOverrides,
      setTenantOverrides,
      activeLanguageCodes,
      importFromCsv,
      exportCsv,
      syncMissingFromDefault,
    }),
    [
      languages,
      keys,
      translationMap,
      settings,
      tenantOverrides,
      activeLanguageCodes,
      importFromCsv,
      exportCsv,
      syncMissingFromDefault,
    ],
  );

  return <LanguageModuleContext.Provider value={value}>{children}</LanguageModuleContext.Provider>;
}

export function useLanguageModule(): LanguageModuleValue {
  const c = useContext(LanguageModuleContext);
  if (!c) throw new Error('useLanguageModule must be used inside LanguageModuleProvider');
  return c;
}
