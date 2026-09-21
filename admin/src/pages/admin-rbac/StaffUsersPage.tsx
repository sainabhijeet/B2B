import { useMemo, useState, type FormEvent } from 'react';
import { ResourcePanel } from '@/components/ui/ResourcePanel';
import { DataTable } from '@/components/ui/DataTable';
import { adminBtnPrimary, adminBtnSecondary } from '@/components/ui/buttonClasses';
import { useAdminRbac } from '@/components/admin-rbac/AdminRbacContext';
import type { StaffUserRow } from '@/lib/rbacModels';
import { setInp, setLbl } from '@/pages/settings/settingsFormClasses';

function fmtLogin(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function StaffUsersPage() {
  const { staff, setStaff, roles, roleName } = useAdminRbac();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUserRow | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState<'active' | 'disabled'>('active');

  const tableRows = useMemo(() => [...staff].sort((a, b) => a.name.localeCompare(b.name)), [staff]);

  function openAdd() {
    setEditing(null);
    setName('');
    setEmail('');
    setPhone('');
    setRoleId(roles[0]?.id ?? '');
    setStatus('active');
    setFormOpen(true);
  }

  function openEdit(row: StaffUserRow) {
    setEditing(row);
    setName(row.name);
    setEmail(row.email);
    setPhone(row.phone);
    setRoleId(row.roleId);
    setStatus(row.status);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const rId = roleId || roles[0]?.id;
    if (!rId || !name.trim() || !email.trim()) return;

    const emailNorm = email.trim().toLowerCase();
    if (!editing) {
      const dup = staff.some((s) => s.email.toLowerCase() === emailNorm);
      if (dup) {
        window.alert('This email is already used by another staff member.');
        return;
      }
      const id = `staff-${Date.now()}`;
      setStaff((list) => [
        ...list,
        {
          id,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || '—',
          roleId: rId,
          status,
          lastLogin: null,
        },
      ]);
    } else {
      const dup = staff.some(
        (s) => s.id !== editing.id && s.email.toLowerCase() === emailNorm,
      );
      if (dup) {
        window.alert('This email is already used by another staff member.');
        return;
      }
      setStaff((list) =>
        list.map((s) =>
          s.id === editing.id
            ? {
                ...s,
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || '—',
                roleId: rId,
                status,
              }
            : s,
        ),
      );
    }
    closeForm();
  }

  function onDisable(r: StaffUserRow) {
    if (!window.confirm(`Disable ${r.name}? They will lose admin access until re-enabled.`)) return;
    setStaff((list) =>
      list.map((x) => (x.id === r.id ? { ...x, status: 'disabled' as const } : x)),
    );
  }

  function onEnable(r: StaffUserRow) {
    setStaff((list) =>
      list.map((x) => (x.id === r.id ? { ...x, status: 'active' as const } : x)),
    );
  }

  function onResetPassword(r: StaffUserRow) {
    window.alert(`Password reset email would be sent to ${r.email}`);
  }

  return (
    <ResourcePanel
      title="Staff users"
      toolbar={
        <button type="button" className={adminBtnPrimary} onClick={openAdd}>
          Add staff
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
            aria-labelledby="staff-form-title"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={onSubmit}>
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 id="staff-form-title" className="text-sm font-semibold text-slate-900">
                  {editing ? 'Edit staff' : 'Add staff'}
                </h2>
              </div>
              <div className="grid gap-3 p-4">
                <div>
                  <label className={setLbl} htmlFor="staff-name">
                    Name
                  </label>
                  <input
                    id="staff-name"
                    className={setInp}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className={setLbl} htmlFor="staff-email">
                    Email
                  </label>
                  <input
                    id="staff-email"
                    type="email"
                    className={setInp}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className={setLbl} htmlFor="staff-phone">
                    Phone
                  </label>
                  <input
                    id="staff-phone"
                    className={setInp}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className={setLbl} htmlFor="staff-role">
                    Role
                  </label>
                  <select
                    id="staff-role"
                    className={setInp}
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={setLbl} htmlFor="staff-status">
                    Status
                  </label>
                  <select
                    id="staff-status"
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
                <button type="button" className={adminBtnSecondary} onClick={closeForm}>
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
          {
            id: 'id',
            header: 'User ID',
            cell: (r: StaffUserRow) => <span className="font-mono text-[10px]">{r.id}</span>,
          },
          { id: 'name', header: 'Name', cell: (r: StaffUserRow) => r.name },
          { id: 'email', header: 'Email', cell: (r: StaffUserRow) => r.email },
          { id: 'role', header: 'Role', cell: (r: StaffUserRow) => roleName(r.roleId) },
          { id: 'login', header: 'Last login', cell: (r: StaffUserRow) => fmtLogin(r.lastLogin) },
          {
            id: 'status',
            header: 'Status',
            cell: (r: StaffUserRow) => (
              <span className={r.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}>
                {r.status === 'active' ? 'Active' : 'Disabled'}
              </span>
            ),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (r: StaffUserRow) => (
              <div className="flex flex-wrap gap-1">
                <button type="button" className={adminBtnSecondary} onClick={() => openEdit(r)}>
                  Edit
                </button>
                {r.status === 'active' ? (
                  <button type="button" className={adminBtnSecondary} onClick={() => onDisable(r)}>
                    Disable
                  </button>
                ) : (
                  <button
                    type="button"
                    className={adminBtnSecondary}
                    onClick={() => onEnable(r)}
                  >
                    Enable
                  </button>
                )}
                <button type="button" className={adminBtnSecondary} onClick={() => onResetPassword(r)}>
                  Reset password
                </button>
              </div>
            ),
          },
        ]}
        rows={tableRows}
        rowKey={(r: StaffUserRow) => r.id}
      />
      <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
        Changes stay in this browser session until wired to <span className="font-mono">admin_users</span> API.
      </p>
    </ResourcePanel>
  );
}
