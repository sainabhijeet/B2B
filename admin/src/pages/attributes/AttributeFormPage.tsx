import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { CATEGORY_INDUSTRIES, CATEGORY_ROWS } from '@/lib/categoryDemoData';
import type { AttributeFormState, AttributeType } from '@/lib/attributeDemoData';
import {
  ATTRIBUTE_TYPES,
  getAttributeFormState,
  typeLabel,
} from '@/lib/attributeDemoData';

type AttributeFormPageProps = { mode: 'create' | 'edit' };

const lbl =
  'mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500';
const inp =
  'w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900';

const TABS = [
  { id: 'basic', label: 'Basic info' },
  { id: 'values', label: 'Attribute values' },
  { id: 'categories', label: 'Category mapping' },
  { id: 'display', label: 'Display & status' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTabId(s: string | null): s is TabId {
  return TABS.some((t) => t.id === s);
}

export function AttributeFormPage({ mode }: AttributeFormPageProps) {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: TabId = isTabId(tabParam) ? tabParam : 'basic';

  const [form, setForm] = useState<AttributeFormState>(() =>
    getAttributeFormState(mode === 'edit' ? id : undefined),
  );

  useEffect(() => {
    setForm(getAttributeFormState(mode === 'edit' ? id : undefined));
  }, [id, mode]);

  function setTab(t: TabId) {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (t === 'basic') n.delete('tab');
        else n.set('tab', t);
        return n;
      },
      { replace: true },
    );
  }

  function toggleCategory(catId: string) {
    setForm((f) => {
      const s = new Set(f.categoryIds);
      if (s.has(catId)) s.delete(catId);
      else s.add(catId);
      return { ...f, categoryIds: [...s] };
    });
  }

  const valuesRelevant =
    form.type === 'select' || form.type === 'multi_select' || form.type === 'color';

  const title =
    mode === 'create' ? 'Add attribute' : `Edit attribute · ${form.name || id || ''}`;

  return (
    <div>
      <PageHeader
        title={title}
        description="attributes · attribute_values · category_attributes — demo UI."
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Link to="/attributes" className={adminBtnSecondary}>
              ← Attribute list
            </Link>
            <button type="button" className={adminBtnPrimary} onClick={(e) => e.preventDefault()}>
              Save (demo)
            </button>
          </div>
        }
      />

      <div className="-mx-1 mb-4 overflow-x-auto border-b border-slate-200">
        <nav className="flex min-w-max gap-px px-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                tab === t.id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'basic' ? (
        <ResourcePanel title="Basic information">
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={lbl}>Attribute name</label>
              <input
                className={inp}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Color"
              />
            </div>
            <div>
              <label className={lbl}>Attribute type</label>
              <select
                className={inp}
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as AttributeType,
                  }))
                }
              >
                {ATTRIBUTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {typeLabel(t)}
                  </option>
                ))}
              </select>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Text, Number, Select, Multi select, Boolean, Color
              </p>
            </div>
            <div>
              <label className={lbl}>Industry mapping</label>
              <select
                className={inp}
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
              >
                {CATEGORY_INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Description</label>
              <textarea
                className={`${inp} min-h-[4rem] resize-y`}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select
                className={inp}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as AttributeFormState['status'],
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive — not for new products</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={() =>
                    setForm((f) => ({ ...f, isRequired: !f.isRequired }))
                  }
                  className="rounded border-slate-300"
                />
                Required on product (<code className="text-[10px]">is_required</code>)
              </label>
            </div>
            <div className="sm:col-span-2 rounded-sm border border-slate-100 bg-slate-50/80 p-2 text-xs text-slate-600">
              <strong>Variant usage:</strong> enable under Display tab. Example: T-shirt variants from
              Color + Size → Red/M, Red/L, Blue/M…
            </div>
          </div>
        </ResourcePanel>
      ) : null}

      {tab === 'values' ? (
        <ResourcePanel title="Attribute values (attribute_values)">
          <div className="p-3">
            {!valuesRelevant ? (
              <p className="text-xs text-slate-600">
                For type <strong>{typeLabel(form.type)}</strong> values are usually free-form or
                boolean — define options when type is Select, Multi select, or Color (preset names).
              </p>
            ) : (
              <>
                <label className={lbl}>Values (one per line)</label>
                <textarea
                  className={`${inp} min-h-[12rem] font-mono`}
                  value={form.values}
                  onChange={(e) => setForm((f) => ({ ...f, values: e.target.value }))}
                  placeholder={'6\n7\n8\n9\n10'}
                />
                <p className="mt-2 text-xs text-slate-500">
                  Examples: Size → 6–10; Color → Black, White, Blue, Red; RAM → 4GB, 8GB…
                </p>
              </>
            )}
          </div>
        </ResourcePanel>
      ) : null}

      {tab === 'categories' ? (
        <ResourcePanel title="Category linking (category_attributes)">
          <ul className="max-h-72 overflow-auto divide-y divide-slate-100">
            {CATEGORY_ROWS.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div>
                  <span className="text-xs font-medium text-slate-900">{c.name}</span>
                  <span className="ml-2 text-[10px] text-slate-500">
                    {c.industry} · <code>{c.id}</code>
                  </span>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                    className="rounded border-slate-300"
                  />
                  Link
                </label>
              </li>
            ))}
          </ul>
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
            Example: Shoes → Size, Color, Material · Mobile → RAM, Storage, Battery.
          </p>
        </ResourcePanel>
      ) : null}

      {tab === 'display' ? (
        <ResourcePanel title="Sort order, visibility & variants">
          <div className="space-y-4 p-3">
            <div>
              <label className={lbl}>Sort order (UI)</label>
              <input
                className={inp}
                inputMode="numeric"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
              <p className="mt-0.5 text-[10px] text-slate-500">Example: 1 Brand, 2 Size, 3 Color</p>
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Where it appears
              </div>
              {(
                [
                  ['showProductPage', 'Product page'],
                  ['showFilterPanel', 'Filter panel'],
                  ['showSearchFilters', 'Search filters'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                    className="rounded border-slate-300"
                  />
                  {label}
                </label>
              ))}
              <p className="text-[10px] text-slate-500">
                Example: Color → filter panel; Size → filter + search.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 border-t border-slate-100 pt-3 text-xs">
              <input
                type="checkbox"
                checked={form.usedForVariants}
                onChange={() =>
                  setForm((f) => ({ ...f, usedForVariants: !f.usedForVariants }))
                }
                className="rounded border-slate-300"
              />
              Use in variant generation (combine with other variant attributes)
            </label>
          </div>
        </ResourcePanel>
      ) : null}
    </div>
  );
}
