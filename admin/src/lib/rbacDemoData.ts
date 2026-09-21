/** Demo RBAC — maps to admin_users, admin_roles, admin_permissions, role_permissions. */

export type RbacAction = 'view' | 'create' | 'edit' | 'delete';

export type RbacModuleKey =
  | 'tenants'
  | 'plans'
  | 'categories'
  | 'attributes'
  | 'themes'
  | 'build'
  | 'ads'
  | 'analytics'
  | 'settings'
  | 'logs'
  | 'support'
  | 'admin_team';

export const RBAC_MODULE_ORDER: RbacModuleKey[] = [
  'tenants',
  'plans',
  'categories',
  'attributes',
  'themes',
  'build',
  'ads',
  'analytics',
  'settings',
  'logs',
  'support',
  'admin_team',
];

export const MODULE_LABELS: Record<RbacModuleKey, string> = {
  tenants: 'Tenants',
  plans: 'Plans',
  categories: 'Categories',
  attributes: 'Attributes',
  themes: 'Themes',
  build: 'Build Manager',
  ads: 'Ads',
  analytics: 'Analytics',
  settings: 'Settings',
  logs: 'Logs',
  support: 'Support',
  admin_team: 'Admin team',
};

const ALL_ACTIONS: RbacAction[] = ['view', 'create', 'edit', 'delete'];

function fullAccess(): Record<RbacModuleKey, RbacAction[]> {
  const o = {} as Record<RbacModuleKey, RbacAction[]>;
  for (const m of RBAC_MODULE_ORDER) o[m] = [...ALL_ACTIONS];
  return o;
}

/** Deep-copy grant map for in-memory RBAC state updates. */
export function cloneRoleGrants(
  grants: RoleDefinition['grants'],
): RoleDefinition['grants'] {
  const out: RoleDefinition['grants'] = {};
  for (const m of RBAC_MODULE_ORDER) {
    const a = grants[m];
    if (a?.length) out[m] = [...a];
  }
  return out;
}

export type RoleDefinition = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  /** Super Admin cannot be deleted. */
  isProtected: boolean;
  grants: Partial<Record<RbacModuleKey, RbacAction[]>>;
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'role-super-admin',
    name: 'Super Admin',
    description: 'Full platform access; cannot be removed.',
    createdAt: '2024-01-15',
    isProtected: true,
    grants: fullAccess(),
  },
  {
    id: 'role-developer',
    name: 'Developer',
    description: 'Build pipeline, logs, read-only tenants & analytics.',
    createdAt: '2024-03-01',
    isProtected: false,
    grants: {
      tenants: ['view'],
      plans: ['view'],
      build: ['view', 'create', 'edit'],
      logs: ['view'],
      analytics: ['view'],
      themes: ['view'],
      settings: ['view'],
    },
  },
  {
    id: 'role-support',
    name: 'Support Staff',
    description: 'Tenant & ticket workflows; read analytics.',
    createdAt: '2024-03-20',
    isProtected: false,
    grants: {
      tenants: ['view', 'edit'],
      support: ['view', 'create', 'edit'],
      plans: ['view'],
      analytics: ['view'],
      logs: ['view'],
    },
  },
  {
    id: 'role-marketing',
    name: 'Marketing Manager',
    description: 'Ads and read analytics.',
    createdAt: '2024-06-01',
    isProtected: false,
    grants: {
      ads: ['view', 'create', 'edit'],
      analytics: ['view'],
      themes: ['view'],
    },
  },
  {
    id: 'role-finance',
    name: 'Finance Manager',
    description: 'Plans, billing-related settings, read tenants.',
    createdAt: '2024-07-10',
    isProtected: false,
    grants: {
      plans: ['view', 'edit'],
      tenants: ['view'],
      settings: ['view', 'edit'],
      analytics: ['view'],
    },
  },
];

export function getRoleById(id: string): RoleDefinition | undefined {
  return ROLE_DEFINITIONS.find((r) => r.id === id);
}

export function summarizeGrants(grants: RoleDefinition['grants']): string {
  const parts: string[] = [];
  for (const mod of RBAC_MODULE_ORDER) {
    const actions = grants[mod];
    if (!actions?.length) continue;
    parts.push(`${MODULE_LABELS[mod]} (${actions.join('/')})`);
  }
  return parts.length ? parts.join(' · ') : '—';
}

export type StaffUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: string;
  status: 'active' | 'disabled';
  lastLogin: string | null;
};

export const STAFF_USERS: StaffUserRow[] = [
  {
    id: 'staff-1',
    name: 'Rahul Sharma',
    email: 'rahul@superhit.example',
    phone: '+91 98100 11223',
    roleId: 'role-support',
    status: 'active',
    lastLogin: '2026-04-10T12:30:00+05:30',
  },
  {
    id: 'staff-2',
    name: 'Neha Gupta',
    email: 'neha@superhit.example',
    phone: '+91 98200 44556',
    roleId: 'role-marketing',
    status: 'active',
    lastLogin: '2026-04-09T18:00:00+05:30',
  },
  {
    id: 'staff-3',
    name: 'Arjun Mehta',
    email: 'arjun@superhit.example',
    phone: '+91 98300 77889',
    roleId: 'role-developer',
    status: 'active',
    lastLogin: '2026-04-10T09:15:00+05:30',
  },
  {
    id: 'staff-4',
    name: 'Priya Nair',
    email: 'priya@superhit.example',
    phone: '+91 98400 33445',
    roleId: 'role-finance',
    status: 'active',
    lastLogin: '2026-04-08T11:00:00+05:30',
  },
];

export type RbacAuditRow = {
  id: string;
  userName: string;
  email: string;
  action: string;
  module: string;
  timestamp: string;
};

export const RBAC_AUDIT_LOG: RbacAuditRow[] = [
  {
    id: 'rbac-a1',
    userName: 'Rahul Sharma',
    email: 'rahul@superhit.example',
    action: 'Tenant subscription note updated',
    module: 'Tenants',
    timestamp: '2026-04-10T12:30:00+05:30',
  },
  {
    id: 'rbac-a2',
    userName: 'Neha Gupta',
    email: 'neha@superhit.example',
    action: 'Ad campaign paused',
    module: 'Ads',
    timestamp: '2026-04-10T11:45:00+05:30',
  },
  {
    id: 'rbac-a3',
    userName: 'Arjun Mehta',
    email: 'arjun@superhit.example',
    action: 'Build log opened (job bld-231)',
    module: 'Build Manager',
    timestamp: '2026-04-10T11:20:00+05:30',
  },
  {
    id: 'rbac-a4',
    userName: 'Priya Nair',
    email: 'priya@superhit.example',
    action: 'Plan price field reviewed',
    module: 'Plans',
    timestamp: '2026-04-10T10:50:00+05:30',
  },
];
