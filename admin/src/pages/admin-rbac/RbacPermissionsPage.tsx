import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useAdminRbac } from '@/components/admin-rbac/AdminRbacContext';
import {
  MODULE_LABELS,
  RBAC_MODULE_ORDER,
  type RbacAction,
  type RbacModuleKey,
  type RoleDefinition,
} from '@/lib/rbacModels';

const ACTIONS: RbacAction[] = ['view', 'create', 'edit', 'delete'];

function grantsToDraft(g: RoleDefinition['grants']): Record<RbacModuleKey, RbacAction[]> {
  const out = {} as Record<RbacModuleKey, RbacAction[]>;
  for (const m of RBAC_MODULE_ORDER) {
    out[m] = [...(g[m] ?? [])];
  }
  return out;
}

function draftToGrants(draft: Record<RbacModuleKey, RbacAction[]>): RoleDefinition['grants'] {
  const partial: RoleDefinition['grants'] = {};
  for (const m of RBAC_MODULE_ORDER) {
    const a = draft[m];
    if (a?.length) partial[m] = [...a];
  }
  return partial;
}

function hasAction(list: RbacAction[], a: RbacAction) {
  return list.includes(a);
}

function toggleAction(list: RbacAction[], a: RbacAction): RbacAction[] {
  if (list.includes(a)) return list.filter((x) => x !== a);
  const next = [...list, a];
  return ACTIONS.filter((x) => next.includes(x));
}

export function RbacPermissionsPage() {
  const { roles, updateRole } = useAdminRbac();
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const role = useMemo(() => roles.find((r) => r.id === roleId), [roles, roleId]);
  const [draft, setDraft] = useState<Record<RbacModuleKey, RbacAction[]> | null>(null);

  useEffect(() => {
    if (roles.length && !roles.some((r) => r.id === roleId)) {
      setRoleId(roles[0]!.id);
    }
  }, [roles, roleId]);

  const resetDraft = useCallback(() => {
    if (!role) {
      setDraft(null);
      return;
    }
    setDraft(grantsToDraft(role.grants));
  }, [role]);

  useEffect(() => {
    resetDraft();
  }, [resetDraft, roleId, role?.grants]);

  const readOnly = role?.isProtected ?? false;

  if (!role || !draft || !roles.length) {
    return <p className="text-xs text-slate-500">No roles yet — create one under Roles.</p>;
  }

  return (
    <div className="space-y-4">
      <ResourcePanel
        title="Permission matrix"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[10px] font-semibold uppercase text-slate-500">Role</label>
            <select
              className="rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {readOnly ? (
              <span className="text-[10px] text-amber-800">Super Admin — matrix is full access (read-only)</span>
            ) : (
              <button type="button" className={adminBtnSecondary} onClick={resetDraft}>
                Reset
              </button>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="admin-table w-full min-w-[40rem] border-collapse text-left text-xs">
            <thead>
              <tr>
                <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold uppercase tracking-wide text-slate-500">
                  Module
                </th>
                {ACTIONS.map((a) => (
                  <th
                    key={a}
                    className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-center font-semibold capitalize text-slate-500"
                  >
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RBAC_MODULE_ORDER.map((mod) => (
                <tr key={mod} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-800">{MODULE_LABELS[mod]}</td>
                  {ACTIONS.map((a) => {
                    const on = hasAction(draft[mod], a);
                    return (
                      <td key={a} className="px-2 py-2 text-center">
                        {readOnly ? (
                          <span className={on ? 'text-emerald-600' : 'text-slate-300'}>{on ? '✓' : '—'}</span>
                        ) : (
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-slate-300"
                            checked={on}
                            onChange={() =>
                              setDraft((d) => {
                                if (!d) return d;
                                return { ...d, [mod]: toggleAction(d[mod], a) };
                              })
                            }
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3 py-2">
          <button
            type="button"
            className={adminBtnPrimary}
            disabled={readOnly}
            onClick={() => {
              updateRole(role.id, { grants: draftToGrants(draft) });
            }}
          >
            Save permissions
          </button>
        </div>
      </ResourcePanel>

      <ResourcePanel title="Summary matrix (read-only)">
        <div className="overflow-x-auto p-3">
          <table className="admin-table w-full min-w-[36rem] border-collapse text-left text-[11px]">
            <thead>
              <tr>
                <th className="border-b border-slate-200 bg-slate-50 px-2 py-2">Role</th>
                {RBAC_MODULE_ORDER.map((m) => (
                  <th
                    key={m}
                    className="border-b border-slate-200 bg-slate-50 px-1 py-2 text-center text-[9px] font-semibold uppercase text-slate-500"
                  >
                    {MODULE_LABELS[m].slice(0, 4)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-2 py-1.5 font-medium whitespace-nowrap">{r.name}</td>
                  {RBAC_MODULE_ORDER.map((m) => {
                    const acts = r.grants[m] ?? [];
                    const cell =
                      acts.length === 0
                        ? '—'
                        : acts.length === 4
                          ? 'All'
                          : acts.map((x) => x[0]!.toUpperCase()).join('');
                    return (
                      <td key={m} className="px-1 py-1.5 text-center tabular-nums text-slate-700">
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-slate-500">
            Letters = first char of each granted action (V/C/E/D). <strong>All</strong> = full CRUD.
          </p>
        </div>
      </ResourcePanel>
    </div>
  );
}
