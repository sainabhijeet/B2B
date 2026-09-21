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
  cloneRoleGrants,
  type RoleDefinition,
  type StaffUserRow,
} from '@/lib/rbacModels';
import { loadAdminModuleState, saveAdminModuleState } from '@/lib/adminModuleStateApi';

type AdminRbacContextValue = {
  roles: RoleDefinition[];
  staff: StaffUserRow[];
  setStaff: Dispatch<SetStateAction<StaffUserRow[]>>;
  updateRole: (id: string, patch: Partial<Pick<RoleDefinition, 'name' | 'description' | 'grants'>>) => void;
  addRole: (input: { name: string; description: string; copyGrantsFromId: string | null }) => string | null;
  removeRole: (id: string) => boolean;
  roleName: (id: string) => string;
};

const AdminRbacContext = createContext<AdminRbacContextValue | null>(null);

type RbacBackendState = {
  roles: RoleDefinition[];
  staff: StaffUserRow[];
};

const EMPTY_RBAC_STATE: RbacBackendState = {
  roles: [],
  staff: [],
};

export function AdminRbacProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [staff, setStaff] = useState<StaffUserRow[]>([]);
  const rolesRef = useRef(roles);
  const loadedRef = useRef(false);
  useEffect(() => {
    rolesRef.current = roles;
  }, [roles]);

  useEffect(() => {
    let alive = true;
    loadAdminModuleState<RbacBackendState>('rbac', EMPTY_RBAC_STATE)
      .then((state) => {
        if (!alive) return;
        const nextRoles = (state.roles ?? []).map((r) => ({
          ...r,
          grants: cloneRoleGrants(r.grants),
        }));
        setRoles(nextRoles);
        setStaff(state.staff ?? []);
        rolesRef.current = nextRoles;
        loadedRef.current = true;
      })
      .catch(() => {
        if (alive) loadedRef.current = true;
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    void saveAdminModuleState<RbacBackendState>('rbac', { roles, staff });
  }, [roles, staff]);

  const roleName = useCallback(
    (id: string) => roles.find((r) => r.id === id)?.name ?? id,
    [roles],
  );

  const updateRole = useCallback((id: string, patch: Partial<Pick<RoleDefinition, 'name' | 'description' | 'grants'>>) => {
    setRoles((list) =>
      list.map((r) => {
        if (r.id !== id) return r;
        const next: RoleDefinition = { ...r };
        if (patch.name !== undefined) next.name = patch.name;
        if (patch.description !== undefined) next.description = patch.description;
        if (patch.grants !== undefined) next.grants = cloneRoleGrants(patch.grants);
        return next;
      }),
    );
  }, []);

  const addRole = useCallback((input: { name: string; description: string; copyGrantsFromId: string | null }): string | null => {
    const name = input.name.trim();
    if (!name) return null;
    let createdId: string | null = null;
    setRoles((list) => {
      let grants: RoleDefinition['grants'] = {};
      if (input.copyGrantsFromId) {
        const src = list.find((r) => r.id === input.copyGrantsFromId);
        if (src) grants = cloneRoleGrants(src.grants);
      }
      const id = `role-${Date.now()}`;
      createdId = id;
      const row: RoleDefinition = {
        id,
        name,
        description: input.description.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
        isProtected: false,
        grants,
      };
      return [...list, row];
    });
    return createdId;
  }, []);

  const removeRole = useCallback((id: string): boolean => {
    const list = rolesRef.current;
    const target = list.find((r) => r.id === id);
    if (!target || target.isProtected) return false;
    const remaining = list.filter((r) => r.id !== id);
    const fallbackRoleId = remaining[0]?.id ?? 'role-super-admin';
    rolesRef.current = remaining;
    setRoles(remaining);
    setStaff((rows) =>
      rows.map((u) => (u.roleId === id ? { ...u, roleId: fallbackRoleId } : u)),
    );
    return true;
  }, []);

  const value = useMemo(
    () => ({
      roles,
      staff,
      setStaff,
      updateRole,
      addRole,
      removeRole,
      roleName,
    }),
    [roles, staff, updateRole, addRole, removeRole, roleName],
  );

  return <AdminRbacContext.Provider value={value}>{children}</AdminRbacContext.Provider>;
}

export function useAdminRbac(): AdminRbacContextValue {
  const c = useContext(AdminRbacContext);
  if (!c) throw new Error('useAdminRbac must be used inside AdminRbacProvider');
  return c;
}
