import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useLanguageModule } from '@/components/language/LanguageModuleContext';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';
import type { LanguageRow, TextDirection } from '@/lib/languageModuleDemoData';

export function LanguagesCatalogPage() {
  const { languages, setLanguages, setSettings } = useLanguageModule();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LanguageRow | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [direction, setDirection] = useState<TextDirection>('ltr');
  const [status, setStatus] = useState<'active' | 'disabled'>('active');

  function openAdd() {
    setEditing(null);
    setName('');
    setCode('');
    setDirection('ltr');
    setStatus('active');
    setOpen(true);
  }

  function openEdit(row: LanguageRow) {
    setEditing(row);
    setName(row.name);
    setCode(row.code);
    setDirection(row.direction);
    setStatus(row.status);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
  }

  function setAsDefault(row: LanguageRow) {
    if (row.status === 'disabled') {
      window.alert('Enable the language before setting it as default.');
      return;
    }
    setLanguages((list) =>
      list.map((l) => ({ ...l, isDefault: l.id === row.id })),
    );
    setSettings((s) => ({ ...s, defaultLanguageCode: row.code, fallbackLanguageCode: s.fallbackLanguageCode }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const c = code.trim().toLowerCase().replace(/[^a-z-]/g, '');
    if (!n || !c) return;

    if (!editing) {
      if (languages.some((l) => l.code === c)) {
        window.alert('Language code must be unique.');
        return;
      }
      const id = `lang-${c}`;
      setLanguages((list) => [
        ...list,
        { id, name: n, code: c, direction, status, isDefault: false },
      ]);
    } else {
      if (languages.some((l) => l.id !== editing.id && l.code === c)) {
        window.alert('Language code must be unique.');
        return;
      }
      setLanguages((list) =>
        list.map((l) =>
          l.id === editing.id
            ? { ...l, name: n, code: c, direction, status, isDefault: l.isDefault }
            : l,
        ),
      );
    }
    close();
  }

  function disableRow(row: LanguageRow) {
    if (row.isDefault) {
      window.alert('Set another language as default before disabling this one.');
      return;
    }
    if (!window.confirm(`Disable ${row.name}? It will be hidden from locale pickers.`)) return;
    setLanguages((list) =>
      list.map((l) => (l.id === row.id ? { ...l, status: 'disabled' as const } : l)),
    );
  }

  function enableRow(row: LanguageRow) {
    setLanguages((list) =>
      list.map((l) => (l.id === row.id ? { ...l, status: 'active' as const } : l)),
    );
  }

  return (
    <ResourcePanel
      title="Languages"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd}>
          Add language
        </button>
      }
    >
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={close}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-sm border border-slate-200 bg-white shadow-lg"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={onSubmit}>
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  {editing ? 'Edit language' : 'Add language'}
                </h2>
              </div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl} htmlFor="lng-name">
                    Language name
                  </label>
                  <input
                    id="lng-name"
                    className={setInp}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={setLbl} htmlFor="lng-code">
                    Code (ISO)
                  </label>
                  <input
                    id="lng-code"
                    className={setInp}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    disabled={!!editing}
                    title={editing ? 'Code is fixed after create' : undefined}
                  />
                </div>
                <div>
                  <label className={setLbl} htmlFor="lng-dir">
                    Direction
                  </label>
                  <select
                    id="lng-dir"
                    className={setInp}
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as TextDirection)}
                  >
                    <option value="ltr">LTR</option>
                    <option value="rtl">RTL</option>
                  </select>
                </div>
                <div>
                  <label className={setLbl} htmlFor="lng-st">
                    Status
                  </label>
                  <select
                    id="lng-st"
                    className={setInp}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'disabled')}
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={close}>
                  Cancel
                </button>
                <button type="submit" className={adminBtnPrimary}>
                  {editing ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={[
          { id: 'name', header: 'Language name', cell: (r: LanguageRow) => r.name },
          { id: 'code', header: 'Code', cell: (r: LanguageRow) => <span className="font-mono text-xs">{r.code}</span> },
          {
            id: 'dir',
            header: 'Direction',
            cell: (r: LanguageRow) => (r.direction === 'rtl' ? 'RTL' : 'LTR'),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (r: LanguageRow) => (
              <span className={r.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}>
                {r.status === 'active' ? 'Active' : 'Disabled'}
              </span>
            ),
          },
          {
            id: 'def',
            header: 'Default',
            cell: (r: LanguageRow) => (r.isDefault ? 'Yes' : '—'),
          },
          {
            id: 'act',
            header: 'Actions',
            cell: (r: LanguageRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={adminBtnSecondary}
                  disabled={r.isDefault}
                  onClick={() => setAsDefault(r)}
                >
                  Set default
                </button>
                {r.status === 'active' ? (
                  <button type="button" className={adminBtnSecondary} onClick={() => disableRow(r)}>
                    Disable
                  </button>
                ) : (
                  <button type="button" className={adminBtnSecondary} onClick={() => enableRow(r)}>
                    Enable
                  </button>
                )}
              </div>
            ),
          },
        ]}
        rows={languages}
        rowKey={(r: LanguageRow) => r.id}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Start with English, Hindi, and French; enable Spanish, Arabic, or German when you are ready.
      </p>
    </ResourcePanel>
  );
}
