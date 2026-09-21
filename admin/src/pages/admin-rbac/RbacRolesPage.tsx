import { useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnDanger, adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useAdminRbac } from '@/components/admin-rbac/AdminRbacContext';
import { summarizeGrants, type RoleDefinition } from '@/lib/rbacModels';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

export function RbacRolesPage() {
  const { roles, addRole, updateRole, removeRole } = useAdminRbac();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDefinition | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [copyGrantsFromId, setCopyGrantsFromId] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setName('');
    setDescription('');
    setCopyGrantsFromId(roles.find((r) => r.id === 'role-support')?.id ?? roles[0]?.id ?? null);
    setFormOpen(true);
  }

  function openEdit(row: RoleDefinition) {
    setEditing(row);
    setName(row.name);
    setDescription(row.description);
    setCopyGrantsFromId(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    if (!editing) {
      addRole({
        name: name.trim(),
        description: description.trim(),
        copyGrantsFromId,
      });
    } else {
      if (editing.isProtected) {
        updateRole(editing.id, { description: description.trim() });
      } else {
        updateRole(editing.id, {
          name: name.trim(),
          description: description.trim(),
        });
      }
    }
    closeForm();
  }

  return (
    <ResourcePanel
      title="Roles"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd}>
          New role
        </button>
      }
    >
      {formOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={closeForm}
        >
          <div
            className="w-full max-w-md rounded-sm border border-slate-200 bg-white shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-form-title"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={onSubmit}>
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 id="role-form-title" className="text-sm font-semibold text-slate-900">
                  {editing ? 'Edit role' : 'New role'}
                </h2>
              </div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl} htmlFor="role-name">
                    Role name
                  </label>
                  <input
                    id="role-name"
                    className={setInp}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={!!editing?.isProtected}
                  />
                  {editing?.isProtected ? (
                    <p className="mt-1 text-[10px] text-slate-500">Super Admin role name is fixed.</p>
                  ) : null}
                </div>
                <div>
                  <label className={setLbl} htmlFor="role-desc">
                    Description
                  </label>
                  <textarea
                    id="role-desc"
                    className={`${setInp} min-h-[4.5rem] resize-y`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                {!editing ? (
                  <div>
                    <label className={setLbl} htmlFor="role-copy">
                      Copy permissions from
                    </label>
                    <select
                      id="role-copy"
                      className={setInp}
                      value={copyGrantsFromId ?? ''}
                      onChange={(e) => setCopyGrantsFromId(e.target.value || null)}
                    >
                      <option value="">Empty (no module access yet)</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Fine-tune on the <strong>Permissions</strong> tab after saving.
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <button type="button" className={adminBtnSecondary} onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className={adminBtnPrimary}>
                  {editing ? 'Save' : 'Create role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={[
          { id: 'name', header: 'Role name', cell: (r: RoleDefinition) => r.name },
          {
            id: 'perm',
            header: 'Permissions',
            cell: (r: RoleDefinition) => (
              <span className="text-[11px] leading-snug text-slate-700">{summarizeGrants(r.grants)}</span>
            ),
          },
          { id: 'created', header: 'Created', cell: (r: RoleDefinition) => r.createdAt },
          {
            id: 'actions',
            header: 'Actions',
            cell: (r: RoleDefinition) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={adminBtnDanger}
                  disabled={r.isProtected}
                  title={r.isProtected ? 'Super Admin role cannot be deleted' : undefined}
                  onClick={() => {
                    if (r.isProtected) return;
                    if (
                      !window.confirm(
                        `Delete role “${r.name}”? Staff on this role will move to another active role.`,
                      )
                    )
                      return;
                    const ok = removeRole(r.id);
                    if (!ok) window.alert('Could not delete this role.');
                  }}
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        rows={roles}
        rowKey={(r: RoleDefinition) => r.id}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        New roles start from a template or empty grants; assign modules on Permissions. Session-only until API is wired.
      </p>
    </ResourcePanel>
  );
}
