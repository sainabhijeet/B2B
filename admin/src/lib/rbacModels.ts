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
export type RoleDefinition = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  isProtected: boolean;
  grants: Partial<Record<RbacModuleKey, RbacAction[]>>;
};
export type StaffUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: string;
  status: 'active' | 'disabled';
  lastLogin: string | null;
};
export function cloneRoleGrants(
  grants: RoleDefinition['grants'],
): RoleDefinition['grants'] {
  const out: RoleDefinition['grants'] = {};
  for (const m of RBAC_MODULE_ORDER) {
    const actions = grants[m];
    if (actions?.length) out[m] = [...actions];
  }
  return out;
}
export function summarizeGrants(grants: RoleDefinition['grants']): string {
  const parts: string[] = [];
  for (const mod of RBAC_MODULE_ORDER) {
    const actions = grants[mod];
    if (actions?.length) parts.push(`${MODULE_LABELS[mod]} (${actions.join('/')})`);
  }
  return parts.length ? parts.join(' - ') : '-';
}
