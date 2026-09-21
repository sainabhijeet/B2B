export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLATFORM_SUPPORT = 'PLATFORM_SUPPORT',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export const PLATFORM_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.PLATFORM_SUPPORT,
];

export const TENANT_STAFF_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.STAFF,
];
