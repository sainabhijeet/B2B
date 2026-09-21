import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminRbacProvider } from '@/components/admin-rbac/AdminRbacContext';

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/admin-team/staff', label: 'Staff users', end: true },
  { to: '/admin-team/roles', label: 'Roles', end: true },
  { to: '/admin-team/permissions', label: 'Permissions', end: true },
  { to: '/admin-team/activity', label: 'Activity', end: true },
];

export function AdminRbacLayout() {
  return (
    <AdminRbacProvider>
    <div>
      <PageHeader
        title="Staff roles & permissions"
        description="Control what each admin staff member can access. Assign roles — effective permissions follow role_permissions join. Super Admin role cannot be deleted."
      />
      <div className="-mx-1 mb-4 overflow-x-auto border-b border-slate-200">
        <nav className="flex min-w-max gap-px px-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end ?? false}
              className={({ isActive }) =>
                [
                  'whitespace-nowrap border-b-2 px-2.5 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
    </AdminRbacProvider>
  );
}
