import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnDanger, adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useLanguageModule } from '@/components/language/LanguageModuleContext';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';
import type { TranslationKeyRow } from '@/lib/languageModuleDemoData';

export function TranslationKeysPage() {
  const { keys, setKeys, setTranslationMap } = useLanguageModule();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TranslationKeyRow | null>(null);
  const [keyId, setKeyId] = useState('');
  const [module, setModule] = useState('');
  const [description, setDescription] = useState('');

  function openAdd() {
    setEditing(null);
    setKeyId('');
    setModule('');
    setDescription('');
    setOpen(true);
  }

  function openEdit(row: TranslationKeyRow) {
    setEditing(row);
    setKeyId(row.key);
    setModule(row.module);
    setDescription(row.description);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const k = keyId.trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase();
    const mod = module.trim() || 'General';
    const desc = description.trim();
    if (!k) return;

    if (!editing) {
      if (keys.some((x) => x.key === k)) {
        window.alert('This key already exists.');
        return;
      }
      setKeys((list) => [...list, { key: k, module: mod, description: desc }]);
      setTranslationMap((m) => ({ ...m, [k]: {} }));
    } else {
      setKeys((list) =>
        list.map((row) =>
          row.key === editing.key ? { ...row, module: mod, description: desc } : row,
        ),
      );
    }
    close();
  }

  function remove(row: TranslationKeyRow) {
    if (!window.confirm(`Delete key “${row.key}”? All translations for this key will be removed.`)) return;
    setKeys((list) => list.filter((x) => x.key !== row.key));
    setTranslationMap((m) => {
      const next = { ...m };
      delete next[row.key];
      return next;
    });
  }

  return (
    <ResourcePanel
      title="Translation keys"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd}>
          Add key
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
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <form onSubmit={onSubmit}>
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  {editing ? 'Edit translation key' : 'Add translation key'}
                </h2>
              </div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl} htmlFor="tk-key">
                    Key
                  </label>
                  <input
                    id="tk-key"
                    className={setInp}
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                    required
                    disabled={!!editing}
                    placeholder="add_to_cart"
                    title={editing ? 'Rename by adding a new key and migrating in export/import' : undefined}
                  />
                  {editing ? (
                    <p className="mt-1 text-[10px] text-slate-500">Key slug is fixed; delete and re-create to rename.</p>
                  ) : null}
                </div>
                <div>
                  <label className={setLbl} htmlFor="tk-mod">
                    Module
                  </label>
                  <input id="tk-mod" className={setInp} value={module} onChange={(e) => setModule(e.target.value)} placeholder="Product" />
                </div>
                <div>
                  <label className={setLbl} htmlFor="tk-desc">
                    Description
                  </label>
                  <textarea
                    id="tk-desc"
                    className={`${setInp} min-h-[3.5rem]`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
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
          { id: 'key', header: 'Key', cell: (r: TranslationKeyRow) => <span className="font-mono text-xs">{r.key}</span> },
          { id: 'mod', header: 'Module', cell: (r: TranslationKeyRow) => r.module },
          { id: 'desc', header: 'Description', cell: (r: TranslationKeyRow) => r.description },
          {
            id: 'act',
            header: 'Actions',
            cell: (r: TranslationKeyRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
                <button type="button" className={adminBtnDanger} onClick={() => remove(r)}>
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        rows={keys}
        rowKey={(r: TranslationKeyRow) => r.key}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Use stable slugs (e.g. <span className="font-mono">add_to_cart</span>) — frontends resolve via{' '}
        <span className="font-mono">t(&quot;key&quot;)</span> into loaded JSON catalogs.
      </p>
    </ResourcePanel>
  );
}
