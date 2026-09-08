export const SUPERADMIN_ROLES = ['BANK_SUPER_ADMIN', 'SUPERADMIN', 'superadmin'] as const;

export const DELEGATING_ADMIN_ROLES = ['BANK_ADMIN', 'BANK_SUPER_ADMIN'] as const;

/** Lower number = lower privilege. Higher number = higher in org hierarchy. */
export const ROLE_HIERARCHY_LEVELS: Record<string, number> = {
  BANK_SUPER_ADMIN: 100,
  SUPERADMIN: 100,
  superadmin: 100,
  BANK_ADMIN: 80,
  BANK_MAKER: 50,
  BANK_CHECKER: 50,
  CORPORATE_IT_ADMIN: 40,
  CORPORATE_MAKER: 30,
  CORPORATE_CHECKER: 30,
  CORPORATE_VIEWER: 20,
  RETAIL_CUSTOMER: 10,
};

export const DEFAULT_ROLE_HIERARCHY_LEVEL = 10;

export const MAKER_ROLE_PATTERN = /MAKER/i;
export const CHECKER_ROLE_PATTERN = /CHECKER/i;

export enum RoleDutyType {
  MAKER = 'MAKER',
  CHECKER = 'CHECKER',
  OTHER = 'OTHER',
}

export function resolveRoleDutyType(roleName: string): RoleDutyType {
  if (MAKER_ROLE_PATTERN.test(roleName)) {
    return RoleDutyType.MAKER;
  }
  if (CHECKER_ROLE_PATTERN.test(roleName)) {
    return RoleDutyType.CHECKER;
  }
  return RoleDutyType.OTHER;
}

export function extractRealmRoles(user: Record<string, unknown> | undefined): string[] {
  if (!user) {
    return [];
  }
  const realmAccess = user.realm_access as { roles?: string[] } | undefined;
  if (realmAccess?.roles?.length) {
    return realmAccess.roles;
  }
  const roles = user.roles;
  if (Array.isArray(roles)) {
    return roles as string[];
  }
  return [];
}

export function isSuperadmin(user: Record<string, unknown> | undefined): boolean {
  const roles = extractRealmRoles(user);
  return roles.some((role) => SUPERADMIN_ROLES.includes(role as (typeof SUPERADMIN_ROLES)[number]));
}

export function isEmployeeManager(user: Record<string, unknown> | undefined): boolean {
  const roles = extractRealmRoles(user);
  return (
    isSuperadmin(user) ||
    roles.some((role) => DELEGATING_ADMIN_ROLES.includes(role as (typeof DELEGATING_ADMIN_ROLES)[number]))
  );
}

export function resolveRoleHierarchyLevel(roleName: string): number {
  const exact = ROLE_HIERARCHY_LEVELS[roleName];
  if (exact !== undefined) {
    return exact;
  }

  const normalized = roleName.trim().toUpperCase().replace(/\s+/g, '_');
  const normalizedLevel = ROLE_HIERARCHY_LEVELS[normalized];
  if (normalizedLevel !== undefined) {
    return normalizedLevel;
  }

  if (/SUPER.?ADMIN/i.test(roleName)) {
    return ROLE_HIERARCHY_LEVELS.BANK_SUPER_ADMIN;
  }
  if (/BANK_ADMIN/i.test(roleName)) {
    return ROLE_HIERARCHY_LEVELS.BANK_ADMIN;
  }
  if (/MAKER|CHECKER/i.test(roleName)) {
    return ROLE_HIERARCHY_LEVELS.BANK_MAKER;
  }

  return DEFAULT_ROLE_HIERARCHY_LEVEL;
}

export function resolveActorHierarchyLevel(actor: Record<string, unknown> | undefined): number {
  const roles = extractRealmRoles(actor);
  if (!roles.length) {
    return DEFAULT_ROLE_HIERARCHY_LEVEL;
  }
  return Math.max(...roles.map((role) => resolveRoleHierarchyLevel(role)));
}

export function canManageEmployeeWithRole(
  actor: Record<string, unknown>,
  employeeRoleName: string,
): boolean {
  if (isSuperadmin(actor)) {
    return true;
  }
  return resolveActorHierarchyLevel(actor) > resolveRoleHierarchyLevel(employeeRoleName);
}

export function canAssignRoleToEmployee(
  actor: Record<string, unknown>,
  targetRoleName: string,
): boolean {
  if (isSuperadmin(actor)) {
    return true;
  }
  return resolveActorHierarchyLevel(actor) > resolveRoleHierarchyLevel(targetRoleName);
}
